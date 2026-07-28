// Today's focus — a pure assembler. Given per-tracker signals (is it active for
// you, did you do it today, how engaged you've been this week), it returns a
// calm, personalized checklist with one suggested "start here" pick aimed at
// your most-neglected active tracker. Completion is derived from your logs — no
// DB, no XP, no RPG. Replaces the old quests.ts.

import type { IconName } from "@/components/icons";

export type FocusKey =
  | "workout"
  | "meal"
  | "protein"
  | "supps"
  | "gaming"
  | "journal"
  | "goals";

export type FocusSignal = {
  active: boolean; // applies to you (tracker set up / universal)
  done: boolean; // satisfied by today's logs
  engagement: number; // distinct active days in the last 7 (for the pick)
};

export type FocusItem = {
  key: FocusKey;
  label: string;
  icon: IconName;
  href: string;
  done: boolean;
  suggested: boolean; // today's "start here" pick
};

type Meta = { label: string; icon: IconName; href: string };

// Catalog order doubles as the tie-breaker for the suggested pick.
const CATALOG: Record<FocusKey, Meta> = {
  workout: { label: "Log a workout", icon: "workout", href: "/app/workout" },
  meal: { label: "Log a meal", icon: "meal", href: "/app/meal" },
  protein: { label: "Hit your protein target", icon: "meal", href: "/app/meal" },
  supps: { label: "Take your full stack", icon: "supplement", href: "/app/supplement" },
  gaming: { label: "Play & log a match", icon: "gaming", href: "/app/gaming" },
  journal: { label: "Write a journal line", icon: "journal", href: "/app/journal" },
  goals: { label: "Check in on a goal", icon: "goals", href: "/app/goals" },
};

const KEYS = Object.keys(CATALOG) as FocusKey[];
// "protein" is a refinement of "meal", not a tracker of its own — keep it out of
// the pick so we nudge a genuinely neglected tracker.
const PICK_CANDIDATES = KEYS.filter((k) => k !== "protein");

export type FocusBoard = {
  items: FocusItem[];
  doneCount: number;
  total: number;
};

export function buildFocus(signals: Record<FocusKey, FocusSignal>): FocusBoard {
  // The pick: the least-engaged active, not-yet-done tracker this week.
  let suggestedKey: FocusKey | null = null;
  let lowest = Infinity;
  for (const k of PICK_CANDIDATES) {
    const s = signals[k];
    if (!s.active || s.done) continue;
    if (s.engagement < lowest) {
      lowest = s.engagement;
      suggestedKey = k;
    }
  }

  const items: FocusItem[] = KEYS.filter((k) => signals[k].active).map((k) => ({
    key: k,
    label: CATALOG[k].label,
    icon: CATALOG[k].icon,
    href: CATALOG[k].href,
    done: signals[k].done,
    suggested: k === suggestedKey,
  }));

  // Order: suggested first, then remaining incomplete, then completed.
  items.sort((a, b) => {
    if (a.suggested !== b.suggested) return a.suggested ? -1 : 1;
    if (a.done !== b.done) return a.done ? 1 : -1;
    return 0;
  });

  return {
    items,
    doneCount: items.filter((i) => i.done).length,
    total: items.length,
  };
}
