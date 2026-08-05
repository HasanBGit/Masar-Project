// ─── Channel registry ─────────────────────────────────────────────────────────
// Every communication source the platform can ingest from. To add WhatsApp,
// Outlook, Balady, Primavera or Teams: write an adapter whose fetch() returns
// RawMessage[], register it below, flip `available` to true. The pipeline, the
// data model, the timeline and the dashboard require no changes at all — the
// channel becomes a source of construction events like any other.

import type { RawMessage, SourceChannel } from "../../types";
import { fetchGmailMessages } from "./gmail";

/** Credentials/handles a channel may need. Each adapter takes what it uses. */
export interface ChannelContext {
  gmailToken?: string | null;
}

export interface ChannelAdapter {
  id: SourceChannel;
  name: string;
  nameAr: string;
  /** Implemented and shippable today. */
  available: boolean;
  /** Does this channel currently have what it needs to pull? */
  isConnected(ctx: ChannelContext): boolean;
  fetch(ctx: ChannelContext): Promise<RawMessage[]>;
}

/** Placeholder for a source that is modelled but not yet implemented. */
function planned(id: SourceChannel, name: string, nameAr: string): ChannelAdapter {
  return {
    id,
    name,
    nameAr,
    available: false,
    isConnected: () => false,
    fetch: async () => [],
  };
}

export const CHANNELS: ChannelAdapter[] = [
  {
    id: "gmail",
    name: "Gmail",
    nameAr: "Gmail",
    available: true,
    isConnected: (ctx) => !!ctx.gmailToken,
    fetch: (ctx) => fetchGmailMessages(ctx.gmailToken as string),
  },
  planned("whatsapp", "WhatsApp", "واتساب"),
  planned("outlook", "Outlook", "Outlook"),
  planned("balady", "Balady Portal", "منصة بلدي"),
  planned("primavera", "Primavera P6", "Primavera P6"),
  planned("teams", "Microsoft Teams", "Microsoft Teams"),
];

/** Pulls from every channel that is available and currently connected. */
export async function fetchAllChannels(
  ctx: ChannelContext
): Promise<{ messages: RawMessage[]; errors: { channel: SourceChannel; message: string }[] }> {
  const active = CHANNELS.filter((c) => c.available && c.isConnected(ctx));

  const results = await Promise.all(
    active.map(async (c) => {
      try {
        return { channel: c.id, messages: await c.fetch(ctx), error: null as string | null };
      } catch (err: any) {
        return { channel: c.id, messages: [] as RawMessage[], error: err?.message ?? "Fetch failed" };
      }
    })
  );

  return {
    messages: results
      .flatMap((r) => r.messages)
      .sort((a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime()),
    errors: results
      .filter((r) => r.error)
      .map((r) => ({ channel: r.channel, message: r.error as string })),
  };
}
