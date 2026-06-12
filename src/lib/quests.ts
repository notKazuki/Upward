// Daily quests — a pure assembler. Given per-tracker signals (is it active for
// you, did you do it today, how engaged have you been this week), it returns
// today's personalized quest list with one Sherpa "focus" pick aimed at your
// most-neglected active path. Completion is derived from your logs — no DB.

import type { IconName } from "@/components/icons";
import { ATTR_ACCENT, type AttrId } from "./character";

export type QuestKey = "workout" | "meal" | "protein" | "supps" | "gaming" | "journal" | "goals";

export type QuestSignal = {
  active: boolean; // does this quest apply to you (tracker set up / universal)
  done: boolean; // satisfied by today's logs
  engagement: number; // distinct active days in the last 7 (for focus pick)
};

export type Quest = {
  key: QuestKey;
  label: string;
  attr: AttrId;
  color: string;
  icon: IconName;
  href: string;
  xp: number;
  done: boolean;
  focus: boolean; // the Sherpa's pick for today
};

type Meta = { label: string; attr: AttrId; icon: IconName; href: string; xp: number };

// Catalog order doubles as the focus tie-breaker.
const CATALOG: Record<QuestKey, Meta> = {
  workout: { label: "Log a workout", attr: "str", icon: "workout", href: "/app/workout", xp: 40 },
  meal: { label: "Log a meal", attr: "vit", icon: "meal", href: "/app/meal", xp: 15 },
  protein: { label: "Hit your protein target", attr: "vit", icon: "meal", href: "/app/meal", xp: 10 },
  supps: { label: "Take your full stack", attr: "discipline", icon: "supplement", href: "/app/supplement", xp: 10 },
  gaming: { label: "Play & log a match", attr: "focus", icon: "gaming", href: "/app/gaming", xp: 8 },
  journal: { label: "Write a journal line", attr: "mind", icon: "journal", href: "/app/journal", xp: 12 },
  goals: { label: "Check in on a goal", attr: "discipline", icon: "goals", href: "/app/goals", xp: 8 },
};

const KEYS = Object.keys(CATALOG) as QuestKey[];
// "protein" is a refinement of "meal", not a path of its own — keep it out of
// the focus pick so the Sherpa nudges a real neglected tracker.
const FOCUS_CANDIDATES = KEYS.filter((k) => k !== "protein");

export type QuestBoard = {
  quests: Quest[];
  doneCount: number;
  total: number;
  xpEarned: number;
  xpTotal: number;
};

export function buildQuests(signals: Record<QuestKey, QuestSignal>): QuestBoard {
  // The focus pick: the least-engaged active, not-yet-done tracker this week.
  let focusKey: QuestKey | null = null;
  let lowest = Infinity;
  for (const k of FOCUS_CANDIDATES) {
    const s = signals[k];
    if (!s.active || s.done) continue;
    if (s.engagement < lowest) {
      lowest = s.engagement;
      focusKey = k;
    }
  }

  const quests: Quest[] = KEYS.filter((k) => signals[k].active).map((k) => {
    const m = CATALOG[k];
    return {
      key: k,
      label: m.label,
      attr: m.attr,
      color: ATTR_ACCENT[m.attr],
      icon: m.icon,
      href: m.href,
      xp: m.xp,
      done: signals[k].done,
      focus: k === focusKey,
    };
  });

  // Order: focus first, then remaining incomplete (by XP), then completed.
  quests.sort((a, b) => {
    if (a.focus !== b.focus) return a.focus ? -1 : 1;
    if (a.done !== b.done) return a.done ? 1 : -1;
    return b.xp - a.xp;
  });

  const xpTotal = quests.reduce((s, q) => s + q.xp, 0);
  const xpEarned = quests.filter((q) => q.done).reduce((s, q) => s + q.xp, 0);
  return {
    quests,
    doneCount: quests.filter((q) => q.done).length,
    total: quests.length,
    xpEarned,
    xpTotal,
  };
}
