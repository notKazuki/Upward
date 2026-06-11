// The Sherpa — your guide's daily read. Deterministic for now (the Claude-
// powered conversational version is a later Pro feature): given the character
// sheet and skill paths, it surfaces the single highest-signal observation and
// one concrete quest, in-character. Pure function, no data fetching.

import { CLASSES, type Attribute, type AttrId, type Character } from "./character";
import type { SkillPath } from "./skill-trees";

export type SherpaBrief = {
  greeting: string;
  line: string;
  quest: { text: string; href: string } | null;
};

const TRACKER: Record<AttrId, { href: string; verb: string }> = {
  str: { href: "/app/workout", verb: "log a set" },
  vit: { href: "/app/meal", verb: "log a meal" },
  focus: { href: "/app/gaming", verb: "log a match" },
  mind: { href: "/app/journal", verb: "write a line" },
  discipline: { href: "/app/goals", verb: "check in on a goal" },
};

// Calm guide's wisdom — stable per session, varied by level so it isn't static.
const OPENERS = [
  "The air is thin up here, but you're climbing well.",
  "Every summit was once thought impossible.",
  "Steady steps. The peak is patient.",
  "Rest when you must; quit never.",
  "The mountain keeps an honest score — and so do I.",
  "Strength is built on the days no one is watching.",
];

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function buildSherpa(character: Character, paths: SkillPath[]): SherpaBrief {
  const { klass, dominant, ascendant, attributes } = character;
  const scored = attributes.filter((a): a is Attribute & { score: number } => a.score !== null);

  // New climber — nothing logged yet.
  if (scored.length === 0) {
    return {
      greeting: "So — you've reached Base Camp.",
      line: "Your map is blank, but every climber starts here. Log a single thing and your character begins to take shape.",
      quest: { text: "Log your first workout, meal, or match", href: "/app" },
    };
  }

  const weakest = [...scored].sort((a, b) => a.score - b.score)[0];
  const greeting = OPENERS[(dominant ? Math.max(0, weakest.score) : 0) % OPENERS.length];

  // --- the one observation, by priority --------------------------------
  let line: string;
  if (ascendant && ascendant.gap <= 8) {
    // A class change is within reach — the most exciting thing to say.
    line = `Your ${ascendant.attr.label} is only ${ascendant.gap} from overtaking ${dominant?.label}. Tend it, and you'll walk this mountain as a ${CLASSES[ascendant.attr.id].name}.`;
  } else if (weakest.score < 50) {
    line = `${weakest.label} is the thinnest path on your map. The climbers who last are the ones who shore up their weakest face — not the ones who only train their strongest.`;
  } else if (dominant) {
    line = `${dominant.label} is where you're strongest — that's your ${klass.name} blood. Lean on it when the climb steepens, but don't let the other paths grow over.`;
  } else {
    line = "You're moving on every front. Hold this rhythm and the ranks will fall behind you.";
  }

  // --- one quest: the closest win, else shore up the weakest path -------
  const withProgress = paths
    .map((p) => p.next)
    .filter((n): n is NonNullable<typeof n> => Boolean(n?.progress))
    .sort((a, b) => (b.progress?.pct ?? 0) - (a.progress?.pct ?? 0));
  const closest = withProgress[0];
  const closestPath = closest ? paths.find((p) => p.next?.id === closest.id) : undefined;

  let quest: SherpaBrief["quest"];
  if (closest?.progress && closestPath) {
    const remaining = closest.progress.target - closest.progress.current;
    const t = TRACKER[closestPath.attr];
    quest = {
      text: `${remaining} from "${closest.label}" on your ${closestPath.label} path — ${t.verb} today.`,
      href: t.href,
    };
  } else {
    const t = TRACKER[weakest.id];
    quest = { text: `${cap(t.verb)} to grow your ${weakest.label}.`, href: t.href };
  }

  return { greeting, line, quest };
}
