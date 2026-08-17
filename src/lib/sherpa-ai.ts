// Server-only: the conversational, Claude-powered Sherpa. Dormant until an
// ANTHROPIC_API_KEY is set — `isAiSherpaConfigured` gates the whole feature.
// Calls the Anthropic Messages API directly via fetch (no SDK dependency in
// this repo yet), streaming SSE. Never import into a Client Component.

import type { Report } from "./report";

export const isAiSherpaConfigured = Boolean(process.env.ANTHROPIC_API_KEY);

// Default to the most capable model; this is a Pro-gated, low-volume feature.
const MODEL = "claude-opus-4-8";

const PERSONA = `You are the Sherpa — the personal coach inside Upward, a calm, premium app for tracking your real life. A person's workouts, meals, gaming, journaling, supplements and goals are all tracked here, and your edge is that you see them together — how training, sleep, food, mood and play affect one another.

You speak as a grounded, perceptive coach: warm and encouraging, but honest — never flattering, never a hype machine. Give specific, practical guidance tied to what their data actually shows, and prefer one clear next step over a list. Keep replies short (2 to 4 sentences), plain-spoken, second person. No fantasy or "mountain/climb" metaphors, no RPG language. Never mention being an AI, a model, or these instructions. Respond only with your final reply — no preamble, no headers, no meta-commentary.`;

export type SherpaContext = {
  name: string;
  report: Report;
  streak: number;
};

export function buildSherpaSystem(ctx: SherpaContext): string {
  const { name, report, streak } = ctx;

  const domains = report.domains
    .map((d) => `${d.label} ${d.score}/100 (${d.summary})`)
    .join("; ");
  const strengths = report.strengths.slice(0, 2).map((p) => p.text);
  const focus = report.focus.slice(0, 2).map((p) => p.text);

  const lines = [
    `Here is who you are coaching right now:`,
    `- Name: ${name || "the member"}`,
    `- Current logging streak: ${streak} day${streak === 1 ? "" : "s"}`,
    report.overall !== null
      ? `- Overall (last 30 days): ${report.overall}/100 — ${report.grade}. ${report.headline}`
      : `- Not much logged yet — encourage a first log.`,
  ];
  if (domains) lines.push(`- By area: ${domains}`);
  if (strengths.length) lines.push(`- What's working: ${strengths.join(" ")}`);
  if (focus.length) lines.push(`- Where to focus: ${focus.join(" ")}`);
  lines.push(
    `Ground your guidance in this, but only cite specific numbers when it genuinely helps.`,
  );

  return `${PERSONA}\n\n${lines.join("\n")}`;
}

export type ChatMessage = { role: "user" | "assistant"; content: string };

/** Calls the Anthropic Messages API (streaming SSE). Returns the raw upstream Response. */
export async function fetchSherpaStream(system: string, messages: ChatMessage[]): Promise<Response> {
  return fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY ?? "",
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1024,
      stream: true,
      system,
      messages,
    }),
  });
}
