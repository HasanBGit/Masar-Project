import { useState, useCallback, useEffect, useMemo } from "react";
import type {
  ConstructionEvent,
  Project,
  SyncState,
  ConnectorStatus,
  IngestionStats,
  ProjectIntelligence,
  Panel,
} from "../types";
import { CHANNELS, fetchAllChannels } from "../services/channels";
import { runPipeline, rerunReasoning } from "../services/pipeline";
import { getLayerHealth, isAiConfigured, clearLlmCache } from "../services/llm";
import { REASONING_ENABLED } from "../config";

export const PROJECTS: Project[] = [
  {
    id: "tower-01",
    name: "King Abdulaziz Road Tower",
    nameAr: "برج طريق الملك عبدالعزيز",
    location: "Riyadh",
    phase: "Structure — Floor 14",
    phaseAr: "الهيكل الإنشائي — الطابق 14",
    progress: 42,
  },
  {
    id: "villas-c",
    name: "Diriyah Gate Villas — Zone C",
    nameAr: "فلل بوابة الدرعية — المنطقة ج",
    location: "Diriyah",
    phase: "MEP Rough-in",
    phaseAr: "الكهروميكانيكية الأولية",
    progress: 68,
  },
  {
    id: "park-02",
    name: "Al Nakheel Business Park",
    nameAr: "مجمع النخيل التجاري",
    location: "Jeddah",
    phase: "Fit-out",
    phaseAr: "التشطيبات الداخلية",
    progress: 87,
  },
];

const EMPTY_STATS: IngestionStats = {
  received: 0,
  receivedToday: 0,
  events: 0,
  filtered: 0,
  needsReview: 0,
  failed: 0,
  reasoned: 0,
};

/** Which stage of the pipeline is currently running — surfaced in the UI so a
 *  two-layer sync doesn't look like a hang. */
export type PipelineStage = "idle" | "fetching" | "extracting" | "reasoning" | "synthesising";

export function useWorkspaceState(token: string | null) {
  const [activeProject, setActiveProject] = useState<Project>(PROJECTS[0]);
  const [activePanel, setActivePanel] = useState<Panel>("dashboard");

  const [events, setEvents] = useState<ConstructionEvent[]>([]);
  const [reviewQueue, setReviewQueue] = useState<ConstructionEvent[]>([]);
  const [intelligence, setIntelligence] = useState<Record<string, ProjectIntelligence>>({});
  const [stats, setStats] = useState<IngestionStats>(EMPTY_STATS);

  const [syncState, setSyncState] = useState<SyncState>("idle");
  const [stage, setStage] = useState<PipelineStage>("idle");
  const [lastSync, setLastSync] = useState<string | undefined>();
  const [syncError, setSyncError] = useState<string | null>(null);
  const [hasSynced, setHasSynced] = useState(false);

  // ─── Sync: pull channels, then run both AI layers ──────────────────────────
  const sync = useCallback(
    async (options?: { force?: boolean }) => {
      if (!token) {
        setSyncError("Not authenticated");
        return;
      }

      setSyncState("syncing");
      setSyncError(null);
      setStage("fetching");

      // A forced re-sync re-runs both layers instead of reusing cached verdicts.
      if (options?.force) clearLlmCache();

      try {
        const { messages, errors } = await fetchAllChannels({ gmailToken: token });
        const result = await runPipeline(messages, PROJECTS, setStage);

        setEvents(result.events);
        setReviewQueue(result.review);
        setIntelligence(result.intelligence);
        setStats(result.stats);
        setLastSync(new Date().toISOString());
        setHasSynced(true);
        setStage("idle");

        if (errors.length > 0) {
          setSyncError(errors.map((e) => `${e.channel}: ${e.message}`).join(" · "));
          setSyncState("error");
          return;
        }

        // Every message failed extraction — surface it rather than showing an
        // empty record that looks like "no activity".
        if (result.stats.received > 0 && result.stats.failed === result.stats.received) {
          setSyncError(getLayerHealth("extraction").lastError ?? "AI extraction unavailable");
          setSyncState("error");
          return;
        }

        setSyncState("idle");
      } catch (err) {
        setSyncError(err instanceof Error ? err.message : String(err));
        setSyncState("error");
        setStage("idle");
        setHasSynced(true);
      }
    },
    [token]
  );

  /** Re-runs Layer 2 only. No channel is touched — the record is already
   *  channel-neutral, so this costs nothing against Gmail. */
  const reanalyse = useCallback(async () => {
    if (events.length === 0) return;
    setSyncState("syncing");
    setStage("reasoning");
    try {
      const result = await rerunReasoning(events, PROJECTS);
      setEvents(result.events);
      setIntelligence(result.intelligence);
      setStats((s) => ({ ...s, reasoned: result.events.filter((e) => e.reasoning).length }));
      setSyncState("idle");
    } catch (err) {
      setSyncError(err instanceof Error ? err.message : String(err));
      setSyncState("error");
    } finally {
      setStage("idle");
    }
  }, [events]);

  // ─── Review queue decisions ────────────────────────────────────────────────
  const byRecency = (a: ConstructionEvent, b: ConstructionEvent) =>
    new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime();

  const acceptReview = useCallback(
    (id: string) => {
      const item = reviewQueue.find((e) => e.id === id);
      if (!item) return;
      setReviewQueue((prev) => prev.filter((e) => e.id !== id));
      setEvents((prev) => [{ ...item, needsHumanReview: false }, ...prev].sort(byRecency));
      setStats((s) => ({ ...s, events: s.events + 1, needsReview: Math.max(0, s.needsReview - 1) }));
    },
    [reviewQueue]
  );

  const dismissReview = useCallback((id: string) => {
    setReviewQueue((prev) => prev.filter((e) => e.id !== id));
    setStats((s) => ({
      ...s,
      needsReview: Math.max(0, s.needsReview - 1),
      filtered: s.filtered + 1,
    }));
  }, []);

  // Initial sync once a token arrives
  useEffect(() => {
    if (token && !hasSynced && syncState === "idle") {
      sync();
    }
  }, [token, hasSynced, syncState, sync]);

  // Reset when the user signs out
  useEffect(() => {
    if (!token) {
      setEvents([]);
      setReviewQueue([]);
      setIntelligence({});
      setStats(EMPTY_STATS);
      setHasSynced(false);
      setLastSync(undefined);
    }
  }, [token]);

  // ─── Connector health: both AI layers, then every channel ──────────────────
  const connectors: ConnectorStatus[] = useMemo(() => {
    const extraction = getLayerHealth("extraction");
    const reasoning = getLayerHealth("reasoning");

    const layerStatus = (
      id: string,
      name: string,
      nameAr: string,
      health: typeof extraction,
      subtitle: string,
      subtitleAr: string,
      enabled: boolean
    ): ConnectorStatus => ({
      id,
      name,
      nameAr,
      kind: "intelligence",
      available: true,
      connected: health.configured && enabled,
      lastSync,
      count: health.calls,
      healthy: !enabled ? undefined : health.configured ? health.failures === 0 : false,
      detail: !enabled
        ? "Disabled in configuration"
        : !health.configured
        ? "No API key configured"
        : health.failures > 0
        ? `${health.failures} ${health.failures === 1 ? "failure" : "failures"} · ${health.lastError ?? ""}`
        : `${subtitle} · ${health.model} · ${health.calls} calls, ${health.cacheHits} cached${health.throttled > 0 ? `, ${health.throttled} throttled retries` : ""}`,
      detailAr: !enabled
        ? "معطّلة في الإعدادات"
        : !health.configured
        ? "لا يوجد مفتاح API"
        : health.failures > 0
        ? `${health.failures} حالة فشل`
        : `${subtitleAr} · ${health.model} · ${health.calls} طلب، ${health.cacheHits} من الذاكرة`,
    });

    const layers: ConnectorStatus[] = [
      layerStatus(
        "layer-extraction",
        "Layer 1 · AI Extraction",
        "الطبقة ١ · الاستخلاص",
        extraction,
        "Messages to structured events",
        "من الرسائل إلى أحداث منظّمة",
        true
      ),
      layerStatus(
        "layer-reasoning",
        "Layer 2 · AI Reasoning",
        "الطبقة ٢ · الاستدلال",
        reasoning,
        "Events to project intelligence",
        "من الأحداث إلى ذكاء المشروع",
        REASONING_ENABLED
      ),
    ];

    const channelStatuses: ConnectorStatus[] = CHANNELS.map((c) => {
      const connected = c.isConnected({ gmailToken: token });
      const count = events.filter((e) => e.evidence.channel === c.id).length;

      return {
        id: c.id,
        name: c.name,
        nameAr: c.nameAr,
        kind: "channel",
        available: c.available,
        connected,
        lastSync: connected ? lastSync : undefined,
        count,
        healthy: !c.available || !connected ? undefined : !syncError,
        detail: connected ? `${count} construction ${count === 1 ? "event" : "events"} extracted` : undefined,
        detailAr: connected ? `${count} حدث إنشائي مستخرج` : undefined,
      };
    });

    return [...layers, ...channelStatuses];
  }, [token, lastSync, events, syncError]);

  return {
    projects: PROJECTS,
    activeProject,
    setActiveProject,
    activePanel,
    setActivePanel,
    events,
    reviewQueue,
    intelligence,
    activeIntelligence: intelligence[activeProject.id] ?? null,
    stats,
    stage,
    syncState,
    lastSync,
    syncError,
    connectors,
    aiConfigured: isAiConfigured(),
    reasoningEnabled: REASONING_ENABLED,
    sync,
    reanalyse,
    acceptReview,
    dismissReview,
  };
}
