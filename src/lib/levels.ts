// XP → level → rank. XP is computed deterministically from real logged activity
// (with daily per-category caps so it can't be farmed), the same "derive from
// data" approach as the report card. No transactional ledger.

// --- XP curve --------------------------------------------------------------
/** XP required to advance from `level` to `level + 1`. Grows linearly. */
export function xpToNext(level: number): number {
  return 100 + (level - 1) * 50;
}

/** Cumulative XP required to *reach* a level (level 1 = 0 XP). */
export function xpForLevel(level: number): number {
  let total = 0;
  for (let l = 1; l < level; l++) total += xpToNext(l);
  return total;
}

export type LevelInfo = {
  level: number;
  xp: number;
  intoLevel: number; // XP earned within the current level
  span: number; // XP needed to clear the current level
  progress: number; // 0-100
};

export function levelForXp(xp: number): LevelInfo {
  let level = 1;
  while (xp >= xpForLevel(level + 1)) level++;
  const base = xpForLevel(level);
  const span = xpToNext(level);
  const intoLevel = xp - base;
  return { level, xp, intoLevel, span, progress: Math.round((intoLevel / span) * 100) };
}

// --- rank ladder (mountain ascent) ----------------------------------------
export type Rank = { id: string; name: string; minLevel: number; color: string };

export const RANKS: Rank[] = [
  { id: "base", name: "Base Camp", minLevel: 1, color: "#a89e8f" },
  { id: "foothills", name: "Foothills", minLevel: 10, color: "#7c9473" },
  { id: "ridge", name: "Ridge", minLevel: 20, color: "#5f8aa8" },
  { id: "ascent", name: "Ascent", minLevel: 35, color: "#c9a23f" },
  { id: "alpine", name: "Alpine", minLevel: 50, color: "#9a6a8a" },
  { id: "summit", name: "Summit", minLevel: 70, color: "#bc572f" },
  { id: "peak", name: "Peak", minLevel: 90, color: "#d4825a" },
];

export function rankForLevel(level: number): Rank {
  let r = RANKS[0];
  for (const rank of RANKS) if (level >= rank.minLevel) r = rank;
  return r;
}

/** The next rank up (or null if already at Peak), for "X levels to <rank>". */
export function nextRank(level: number): Rank | null {
  return RANKS.find((r) => r.minLevel > level) ?? null;
}

// --- XP awards (per day, capped) ------------------------------------------
export const XP = {
  workoutDay: 40, // any workout that day
  mealDay: 15, // logged any meal that day
  calorieTarget: 10, // within ±15% of calorie target that day
  proteinTarget: 10, // >= 90% of protein target that day
  journalDay: 12,
  supplementPerfectDay: 10, // took the whole stack that day
  gamingDay: 8,
  goalCheckinDay: 8, // any goal check-in that day
  goalCompleted: 150, // each completed goal
} as const;

export type DailyActivity = {
  workoutDays: Set<string>;
  mealDays: Map<string, { calories: number; protein: number }>;
  journalDays: Set<string>;
  supplementDays: Map<string, number>; // date → distinct supplements taken
  gamingDays: Set<string>;
  goalCheckinDays: Set<string>;
  goalsCompleted: number;
  supplementsInStack: number;
};

export function computeXp(
  a: DailyActivity,
  targets: { calories?: number; protein?: number },
): number {
  let xp = 0;
  xp += a.workoutDays.size * XP.workoutDay;
  xp += a.journalDays.size * XP.journalDay;
  xp += a.gamingDays.size * XP.gamingDay;
  xp += a.goalCheckinDays.size * XP.goalCheckinDay;
  xp += a.goalsCompleted * XP.goalCompleted;

  for (const v of a.mealDays.values()) {
    xp += XP.mealDay;
    if (targets.calories && Math.abs(v.calories - targets.calories) <= targets.calories * 0.15) {
      xp += XP.calorieTarget;
    }
    if (targets.protein && v.protein >= targets.protein * 0.9) xp += XP.proteinTarget;
  }

  if (a.supplementsInStack > 0) {
    for (const taken of a.supplementDays.values()) {
      if (taken >= a.supplementsInStack) xp += XP.supplementPerfectDay;
    }
  }

  return xp;
}
