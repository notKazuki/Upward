// The Sherpa's daily read — deterministic, from your real cross-domain data.
// Given the coach context (30-day report + today's focus + streak), it surfaces
// one calm greeting, the single highest-signal observation, and one concrete
// next step. Pure function, no data fetching, no RPG.

import type { CoachContext } from "./coach-data";

export type SherpaBrief = {
  greeting: string;
  line: string;
  focus: { text: string; href: string } | null;
};

const GREETINGS = [
  "Here's where you stand today.",
  "A quick read on your week.",
  "One honest look at the picture.",
  "Let's find today's one thing.",
];

export function buildBrief(ctx: CoachContext): SherpaBrief {
  const { report, focus, streak } = ctx;

  // Nothing logged yet.
  if (!ctx.hasData) {
    return {
      greeting: "Good to have you here.",
      line: "Log a workout, a meal, or a match and I'll start reading the patterns across your week — training, food, mind, and play, all together.",
      focus: { text: "Log your first thing", href: "/app" },
    };
  }

  const greeting =
    streak >= 3
      ? `${streak} days running — nicely done.`
      : GREETINGS[(report.overall ?? 0) % GREETINGS.length];

  // The one observation: the report headline, plus the sharpest focus point
  // when there is one worth naming.
  const focusPoint = report.focus[0]?.text ?? null;
  const line = focusPoint ? `${report.headline} ${focusPoint}` : report.headline;

  // One concrete next step — the suggested item from today's focus, else the
  // first thing not yet done.
  const pick = focus.items.find((i) => i.suggested && !i.done) ?? focus.items.find((i) => !i.done);
  const step = pick ? { text: pick.label, href: pick.href } : null;

  return { greeting, line, focus: step };
}
