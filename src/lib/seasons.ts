// Seasons — Upward's monthly ascent chapter. Each calendar month is a named
// season with a derived "season XP" track (XP earned *this month*) that unlocks
// a row of rewards. Free tiers light up for everyone; Pro tiers are scaffolded
// dormant (locked until monetization lands — same pattern as the AI Sherpa).
// Pure + deterministic: nothing here is stored, it's all derived from logs.

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
] as const;

// One themed chapter per month — mountaineering-flavoured, tasteful, evocative.
type Theme = { name: string; theme: string; color: string };
const SEASON_THEMES: Theme[] = [
  { name: "First Light", theme: "New snow, fresh tracks — the year's first climb.", color: "#5f8aa8" },
  { name: "The Long Cold", theme: "Hard ground rewards the stubborn.", color: "#7c9473" },
  { name: "The Thaw", theme: "The mountain softens. Momentum returns.", color: "#7c9473" },
  { name: "High Water", theme: "Meltwater and movement — everything flows uphill.", color: "#5f8aa8" },
  { name: "Green Ridge", theme: "The treeline rises to meet you.", color: "#7c9473" },
  { name: "The Long Day", theme: "Light enough to climb well past dusk.", color: "#c9a23f" },
  { name: "Summit Season", theme: "Clear skies, high ambition.", color: "#c9a23f" },
  { name: "Dust & Heat", theme: "The grind that forges discipline.", color: "#bc572f" },
  { name: "Goldenfall", theme: "Crisp air, sharp focus.", color: "#c9a23f" },
  { name: "First Frost", theme: "The descent into discipline.", color: "#9a6a8a" },
  { name: "Grey Pass", theme: "Head down, keep moving.", color: "#a89e8f" },
  { name: "Deep Winter", theme: "Close the year strong — the peak waits.", color: "#9a6a8a" },
];

export type Season = {
  id: string; // "2026-06"
  name: string; // "June · The Long Day"
  theme: string;
  color: string;
  dayOfMonth: number;
  daysInMonth: number;
  daysLeft: number; // days remaining in the season, today excluded
};

export function currentSeason(todayStr: string): Season {
  const [y, m, d] = todayStr.split("-").map(Number);
  const t = SEASON_THEMES[m - 1];
  const daysInMonth = new Date(y, m, 0).getDate(); // m is 1-based → day 0 of next month
  return {
    id: `${y}-${String(m).padStart(2, "0")}`,
    name: `${MONTHS[m - 1]} · ${t.name}`,
    theme: t.theme,
    color: t.color,
    dayOfMonth: d,
    daysInMonth,
    daysLeft: daysInMonth - d,
  };
}

// The reward track. Free tiers are earnable now; Pro tiers render locked until
// monetization exists. Thresholds tuned so an engaged climber clears the free
// tiers comfortably and the Pro tiers stay aspirational over a month.
export type RewardKind = "badge" | "frame" | "title";
export type SeasonReward = { tier: number; xp: number; label: string; kind: RewardKind; pro: boolean };

export const SEASON_REWARDS: SeasonReward[] = [
  { tier: 1, xp: 250, label: "Pathfinder badge", kind: "badge", pro: false },
  { tier: 2, xp: 600, label: "Trailblazer crest", kind: "badge", pro: false },
  { tier: 3, xp: 1100, label: "Seasonal frame", kind: "frame", pro: true },
  { tier: 4, xp: 1700, label: "Seasonal title", kind: "title", pro: true },
  { tier: 5, xp: 2500, label: "Summit Seal", kind: "badge", pro: true },
];

// The season's headline goal: show up most days of the month.
export const SEASON_GOAL_DAYS = 20;

export type SeasonProgress = {
  season: Season;
  xp: number;
  rewards: (SeasonReward & { unlocked: boolean; pct: number })[];
  currentTier: number; // count of unlocked tiers (0 = none yet)
  nextReward: SeasonReward | null;
  toNext: number | null; // season XP to the next tier
  trackPct: number; // 0-100 across the full track
  activeDays: number;
  goalDays: number;
  goalPct: number;
  streak: number;
  bestStreak: number;
};

export function buildSeason(
  input: { seasonXp: number; activeDays: number; streak: number; bestStreak: number },
  todayStr: string,
): SeasonProgress {
  const cap = SEASON_REWARDS[SEASON_REWARDS.length - 1].xp;
  const rewards = SEASON_REWARDS.map((r) => ({
    ...r,
    unlocked: input.seasonXp >= r.xp,
    pct: Math.min(100, (r.xp / cap) * 100), // position along the track bar
  }));
  const next = SEASON_REWARDS.find((r) => input.seasonXp < r.xp) ?? null;
  return {
    season: currentSeason(todayStr),
    xp: input.seasonXp,
    rewards,
    currentTier: rewards.filter((r) => r.unlocked).length,
    nextReward: next,
    toNext: next ? next.xp - input.seasonXp : null,
    trackPct: Math.min(100, Math.round((input.seasonXp / cap) * 100)),
    activeDays: input.activeDays,
    goalDays: SEASON_GOAL_DAYS,
    goalPct: Math.min(100, Math.round((input.activeDays / SEASON_GOAL_DAYS) * 100)),
    streak: input.streak,
    bestStreak: input.bestStreak,
  };
}
