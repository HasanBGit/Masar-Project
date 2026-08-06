// ─── Shared model transport ───────────────────────────────────────────────────
// One client, used by both AI layers. Neither layer owns the connection, the
// retry policy, or the cache  -  they own their prompt and their schema.
//
//   Layer 1 · extraction  → services/extraction.ts   "what is this message?"
//   Layer 2 · reasoning   → services/reasoning.ts    "what does it mean for the project?"

import {
  GEMINI_API_KEY,
  GEMINI_MODEL,
  GEMINI_FALLBACK_MODEL,
} from "../config";

const API_ROOT = "https://generativelanguage.googleapis.com/v1beta/models";

/** Free-tier keys throttle by requests-per-minute (observed: ~20 RPM). Two
 *  layers over a mailbox is easily 60+ calls, so we pace *before* sending
 *  rather than colliding and backing off  -  a paced sync finishes sooner than a
 *  throttled one. Raise the rate on a paid key by lowering this interval. */
const MIN_REQUEST_INTERVAL_MS = 3300; // ≈18 requests/minute
const RATE_LIMIT_RETRIES = 5;
const RETRY_BASE_MS = 2000;
const RETRY_MAX_MS = 30000;

export type Layer = "extraction" | "reasoning";

// ─── Health, tracked per layer so the two are diagnosable separately ──────────

export interface LayerHealth {
  configured: boolean;
  model: string;
  calls: number;
  failures: number;
  cacheHits: number;
  throttled: number;
  lastError: string | null;
  ok: boolean;
}

const stats: Record<Layer, { calls: number; failures: number; cacheHits: number; throttled: number; lastError: string | null }> = {
  extraction: { calls: 0, failures: 0, cacheHits: 0, throttled: 0, lastError: null },
  reasoning: { calls: 0, failures: 0, cacheHits: 0, throttled: 0, lastError: null },
};

let activeModel = GEMINI_MODEL;

export function getLayerHealth(layer: Layer): LayerHealth {
  const s = stats[layer];
  return {
    configured: !!GEMINI_API_KEY,
    model: activeModel,
    calls: s.calls,
    failures: s.failures,
    cacheHits: s.cacheHits,
    throttled: s.throttled,
    lastError: s.lastError,
    ok: !!GEMINI_API_KEY && s.failures === 0,
  };
}

export function isAiConfigured(): boolean {
  return !!GEMINI_API_KEY;
}

// ─── Transport ────────────────────────────────────────────────────────────────
// The key goes as ?key= (standard AI Studio keys). If that is rejected we retry
// once with a Bearer header, which is how OAuth-style tokens authenticate.

type AuthMode = "key" | "bearer";
let authMode: AuthMode = "key";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ─── Client-side pacing ───────────────────────────────────────────────────────
// A single queue across both layers: whatever the concurrency upstream, requests
// leave here no faster than the tier allows.

let nextSlot = 0;

async function waitForSlot(): Promise<void> {
  const now = Date.now();
  const slot = Math.max(now, nextSlot);
  nextSlot = slot + MIN_REQUEST_INTERVAL_MS;
  const wait = slot - now;
  if (wait > 0) await sleep(wait);
}

async function callModel(prompt: string, schema: object, model: string, mode: AuthMode, maxTokens: number): Promise<Response> {
  await waitForSlot();

  const url =
    mode === "key"
      ? `${API_ROOT}/${model}:generateContent?key=${encodeURIComponent(GEMINI_API_KEY)}`
      : `${API_ROOT}/${model}:generateContent`;

  return fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(mode === "bearer" ? { Authorization: `Bearer ${GEMINI_API_KEY}` } : {}),
    },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: maxTokens,
        responseMimeType: "application/json",
        responseSchema: schema,
        // Both layers do their reasoning in the schema fields, not in a scratchpad.
        // Leaving thinking on burns the output budget and has been observed
        // leaking chain-of-thought into string fields.
        thinkingConfig: { thinkingBudget: 0 },
      },
    }),
  });
}

async function errorText(res: Response): Promise<string> {
  const body = await res.json().catch(() => null);
  return body?.error?.message ?? `HTTP ${res.status}`;
}

// ─── Cache ────────────────────────────────────────────────────────────────────
// Structured verdicts only  -  never message bodies.

const CACHE_KEY = "san3:llm:v2";
type CacheMap = Record<string, unknown>;

function loadCache(): CacheMap {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY) ?? "{}") as CacheMap;
  } catch {
    return {};
  }
}

function saveCache(cache: CacheMap) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    /* quota or private mode  -  caching is an optimisation, not a requirement */
  }
}

export function clearLlmCache() {
  try {
    localStorage.removeItem(CACHE_KEY);
  } catch {
    /* non-fatal */
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

export interface GenerateOptions {
  layer: Layer;
  prompt: string;
  schema: object;
  /** Stable key for reuse across syncs. Omit to always call the model. */
  cacheKey?: string;
  maxTokens?: number;
}

/**
 * Sends one structured-output request.
 * Returns null when the call was impossible  -  callers decide what a missing
 * answer means for them; nobody falls back to guessing.
 */
export async function generateJson<T>({ layer, prompt, schema, cacheKey, maxTokens = 1200 }: GenerateOptions): Promise<T | null> {
  const s = stats[layer];

  if (!GEMINI_API_KEY) {
    s.lastError = "VITE_GEMINI_API_KEY is not set";
    return null;
  }

  const fullKey = cacheKey ? `${layer}:${cacheKey}:${activeModel}` : null;
  if (fullKey) {
    const cache = loadCache();
    if (cache[fullKey]) {
      s.cacheHits += 1;
      return cache[fullKey] as T;
    }
  }

  try {
    s.calls += 1;
    let res = await callModel(prompt, schema, activeModel, authMode, maxTokens);

    // Key style rejected → the token may be an OAuth-style credential.
    if ((res.status === 401 || res.status === 403) && authMode === "key") {
      const retry = await callModel(prompt, schema, activeModel, "bearer", maxTokens);
      if (retry.ok) authMode = "bearer";
      res = retry;
    }

    // Model unavailable on this key → drop to the previous generation.
    if (res.status === 404 && activeModel !== GEMINI_FALLBACK_MODEL) {
      activeModel = GEMINI_FALLBACK_MODEL;
      res = await callModel(prompt, schema, activeModel, authMode, maxTokens);
    }

    // Throttling is expected traffic on a free key, not a failure.
    for (let attempt = 1; attempt <= RATE_LIMIT_RETRIES && (res.status === 429 || res.status === 503); attempt++) {
      s.throttled += 1;
      await sleep(Math.min(RETRY_BASE_MS * 2 ** (attempt - 1), RETRY_MAX_MS));
      res = await callModel(prompt, schema, activeModel, authMode, maxTokens);
    }

    if (!res.ok) throw new Error(await errorText(res));

    const data = await res.json();
    const blocked = data?.promptFeedback?.blockReason;
    if (blocked) throw new Error(`Blocked by safety filter: ${blocked}`);

    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    if (!text) throw new Error("Empty response from model");

    const cleaned = text.replace(/```json\s*/gi, "").replace(/```/g, "").trim();
    const parsed = JSON.parse(cleaned) as T;

    if (fullKey) {
      const cache = loadCache();
      cache[fullKey] = parsed;
      saveCache(cache);
    }
    return parsed;
  } catch (err) {
    s.failures += 1;
    // Surfaced through getLayerHealth / the connector health UI, not the console.
    s.lastError = err instanceof Error ? err.message : String(err);
    return null;
  }
}

// ─── Shared value sanitisers ──────────────────────────────────────────────────
// Structured output constrains the model, but never trust a generated value
// straight into the data model.

export function oneOf<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  const v = String(value ?? "").toLowerCase().trim() as T;
  return allowed.includes(v) ? v : fallback;
}

export function str(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function strArray(value: unknown, limit = 12): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((v) => String(v).trim()).filter(Boolean).slice(0, limit);
}

export function clamp01(value: unknown): number {
  return Math.max(0, Math.min(1, Number(value ?? 0)));
}
