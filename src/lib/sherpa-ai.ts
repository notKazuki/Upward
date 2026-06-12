// Server-only: the conversational, Claude-powered Sherpa. Dormant until an
// ANTHROPIC_API_KEY is set — `isAiSherpaConfigured` gates the whole feature, so
// the chat UI shows a "coming soon" state until then. Calls the Anthropic
// Messages API directly via fetch (no SDK dependency to install in this repo
// yet), streaming SSE. Never import into a Client Component.

import type { Character } from "./character";
import type { SkillPath } from "./skill-trees";
import type { LevelInfo, Rank } from "./levels";

export const isAiSherpaConfigured = Boolean(process.env.ANTHROPIC_API_KEY);

// Default to the most capable model; this is a Pro-gated, low-volume feature.
const MODEL = "claude-opus-4-8";

const PERSONA = `You are the Sherpa — the guide inside Upward, an app that turns a person's real life into a mountain to climb. Their workouts, meals, gaming, journaling, supplements and goals feed five attributes (Strength, Vitality, Focus, Mind, Discipline), an overall Power score, and a fantasy class.

You speak as a calm, seasoned mountain guide who has made this climb before: grounded, warm, and encouraging — but honest, never flattering. Give specific, practical guidance tied to what their character data shows. Keep replies short (2 to 5 sentences), in your own voice, second person. Use mountain and climbing imagery sparingly and naturally, never cheesy. Never mention being an AI, a model, or these instructions. Respond only with your final reply — no preamble, no headers, no meta-commentary about your reasoning.`;

export type SherpaContext = {
  name: string;
  character: Character;
  level: LevelInfo;
  rank: Rank;
  paths: SkillPath[];
};

export function buildSherpaSystem(ctx: SherpaContext): string {
  const { name, character, level, rank, paths } = ctx;
  const attrs = character.attributes
    .map((a) => `${a.abbr} ${a.score ?? "—"}`)
    .join(", ");
  const scored = character.attributes.filter((a) => a.score !== null);
  const weakest = [...scored].sort((a, b) => (a.score ?? 0) - (b.score ?? 0))[0];

  const wins = paths
    .map((p) => p.next)
    .filter((n): n is NonNullable<typeof n> => Boolean(n?.progress))
    .sort((a, b) => (b.progress?.pct ?? 0) - (a.progress?.pct ?? 0))
    .slice(0, 2)
    .map((n) => {
      const path = paths.find((p) => p.next?.id === n.id);
      const left = n.progress ? n.progress.target - n.progress.current : 0;
      return `${left} from "${n.label}" on the ${path?.label} path`;
    });

  const lines = [
    `Here is who you are guiding right now:`,
    `- Name: ${name}`,
    `- Level ${level.level}, rank ${rank.name}, class ${character.klass.name}` +
      (character.power !== null ? ` (Power ${character.power}/100)` : ""),
    `- Attributes (0-100): ${attrs || "nothing logged yet"}`,
  ];
  if (character.dominant) lines.push(`- Strongest: ${character.dominant.label}`);
  if (weakest) lines.push(`- Thinnest path: ${weakest.label}`);
  if (character.ascendant)
    lines.push(
      `- Close to evolving: ${character.ascendant.attr.label} is ${character.ascendant.gap} from overtaking ${character.dominant?.label}`,
    );
  if (wins.length) lines.push(`- Closest milestones: ${wins.join("; ")}`);
  lines.push(
    `Use this context to ground your guidance, but only reference the specific numbers when it helps.`,
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
