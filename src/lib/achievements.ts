// Achievement catalog. Each is a deterministic predicate over the user's
// aggregated stats; "earned" rows are persisted (with a date) so badges have an
// unlock time and can be shown on profiles. Earning one also grants bonus XP.

export type Tier = "bronze" | "silver" | "gold" | "platinum";

export const TIERS: Record<Tier, { label: string; color: string; xp: number }> = {
  bronze: { label: "Bronze", color: "#b07a46", xp: 25 },
  silver: { label: "Silver", color: "#9aa3ad", xp: 75 },
  gold: { label: "Gold", color: "#c9a23f", xp: 200 },
  platinum: { label: "Platinum", color: "#7c9cb5", xp: 500 },
};

export type AchievementStats = {
  workouts: number;
  longestStreak: number;
  mealDaysLogged: number;
  proteinHitDays: number;
  journalEntries: number;
  supplementPerfectDays: number;
  gamingMatches: number;
  gamingWinRate: number | null;
  gamingDecided: number;
  goalsCompleted: number;
  goalsCreated: number;
  friends: number;
  level: number;
};

export type AchievementCategory =
  | "Training" | "Nutrition" | "Mind" | "Gaming" | "Goals" | "Supplements" | "Social" | "Levels";

export type Achievement = {
  id: string;
  label: string;
  description: string;
  category: AchievementCategory;
  tier: Tier;
  /** Numeric stat + threshold — present for every simple "reach N" badge, so
   * the UI can show progress toward locked ones. */
  stat?: keyof AchievementStats;
  target?: number;
  test: (s: AchievementStats) => boolean;
};

/** Simple "stat reaches target" badge — progress-trackable. */
const A = (
  id: string,
  label: string,
  description: string,
  category: AchievementCategory,
  tier: Tier,
  stat: keyof AchievementStats,
  target: number,
): Achievement => ({
  id,
  label,
  description,
  category,
  tier,
  stat,
  target,
  test: (s) => Number(s[stat] ?? 0) >= target,
});

/** Compound badge with a custom predicate (no progress bar). */
const AC = (
  id: string,
  label: string,
  description: string,
  category: AchievementCategory,
  tier: Tier,
  test: Achievement["test"],
): Achievement => ({ id, label, description, category, tier, test });

export const ACHIEVEMENTS: Achievement[] = [
  // Training
  A("workout_1", "First Rep", "Log your first workout", "Training", "bronze", "workouts", 1),
  A("workout_5", "Finding the Groove", "Log 5 workouts", "Training", "bronze", "workouts", 5),
  A("workout_10", "Getting Consistent", "Log 10 workouts", "Training", "bronze", "workouts", 10),
  A("workout_25", "Regular", "Log 25 workouts", "Training", "silver", "workouts", 25),
  A("workout_50", "Committed", "Log 50 workouts", "Training", "silver", "workouts", 50),
  A("workout_100", "Centurion", "Log 100 workouts", "Training", "gold", "workouts", 100),
  A("workout_250", "Iron Devotee", "Log 250 workouts", "Training", "gold", "workouts", 250),
  A("streak_3", "Spark", "A 3-day activity streak", "Training", "bronze", "longestStreak", 3),
  A("streak_7", "Week Warrior", "A 7-day activity streak", "Training", "bronze", "longestStreak", 7),
  A("streak_30", "Unbroken", "A 30-day activity streak", "Training", "silver", "longestStreak", 30),
  A("streak_100", "Relentless", "A 100-day activity streak", "Training", "platinum", "longestStreak", 100),

  // Nutrition
  A("meal_1", "First Bite", "Log your first meal", "Nutrition", "bronze", "mealDaysLogged", 1),
  A("meal_3", "Counting", "Log meals on 3 days", "Nutrition", "bronze", "mealDaysLogged", 3),
  A("meal_7", "Tracking In", "Log meals on 7 days", "Nutrition", "bronze", "mealDaysLogged", 7),
  A("meal_30", "Macro Minded", "Log meals on 30 days", "Nutrition", "silver", "mealDaysLogged", 30),
  A("meal_100", "Nutrition Nerd", "Log meals on 100 days", "Nutrition", "gold", "mealDaysLogged", 100),
  A("protein_7", "Protein Pact", "Hit your protein target 7 days", "Nutrition", "bronze", "proteinHitDays", 7),
  A("protein_30", "Anabolic", "Hit your protein target 30 days", "Nutrition", "silver", "proteinHitDays", 30),

  // Mind
  A("journal_1", "Dear Diary", "Write your first journal entry", "Mind", "bronze", "journalEntries", 1),
  A("journal_3", "Opening Up", "Write 3 journal entries", "Mind", "bronze", "journalEntries", 3),
  A("journal_7", "Reflective", "Write 7 journal entries", "Mind", "bronze", "journalEntries", 7),
  A("journal_30", "Inner Work", "Write 30 journal entries", "Mind", "silver", "journalEntries", 30),
  A("journal_100", "Chronicler", "Write 100 journal entries", "Mind", "gold", "journalEntries", 100),

  // Gaming
  A("gaming_1", "Game On", "Log your first match", "Gaming", "bronze", "gamingMatches", 1),
  A("gaming_25", "Warming the Seat", "Log 25 matches", "Gaming", "bronze", "gamingMatches", 25),
  A("gaming_100", "Grinder", "Log 100 matches", "Gaming", "silver", "gamingMatches", 100),
  A("gaming_1000", "Veteran", "Log 1,000 matches", "Gaming", "gold", "gamingMatches", 1000),
  AC("gaming_wr", "Sharpshooter", "55%+ win rate over 50+ games", "Gaming", "silver", (s) => s.gamingDecided >= 50 && (s.gamingWinRate ?? 0) >= 55),

  // Goals
  A("goal_done_1", "Done and Dusted", "Complete a goal", "Goals", "bronze", "goalsCompleted", 1),
  A("goal_done_5", "Goal Getter", "Complete 5 goals", "Goals", "silver", "goalsCompleted", 5),
  A("goal_done_10", "Achiever", "Complete 10 goals", "Goals", "gold", "goalsCompleted", 10),
  A("goal_done_25", "Unstoppable", "Complete 25 goals", "Goals", "platinum", "goalsCompleted", 25),
  A("goal_make_1", "It Starts", "Set your first goal", "Goals", "bronze", "goalsCreated", 1),
  A("goal_make_5", "Dreamer", "Set 5 goals", "Goals", "bronze", "goalsCreated", 5),
  A("goal_make_10", "Visionary", "Set 10 goals", "Goals", "silver", "goalsCreated", 10),

  // Supplements
  A("supp_3", "Remembered", "3 perfect supplement days", "Supplements", "bronze", "supplementPerfectDays", 3),
  A("supp_7", "Stacked", "7 perfect supplement days", "Supplements", "bronze", "supplementPerfectDays", 7),
  A("supp_30", "Routine", "30 perfect supplement days", "Supplements", "silver", "supplementPerfectDays", 30),
  A("supp_100", "Religiously", "100 perfect supplement days", "Supplements", "gold", "supplementPerfectDays", 100),

  // Social
  A("friend_1", "Not Alone", "Add your first friend", "Social", "bronze", "friends", 1),
  A("friends_5", "Squad", "Reach 5 friends", "Social", "silver", "friends", 5),
  A("friends_10", "Connected", "Reach 10 friends", "Social", "gold", "friends", 10),

  // Rank
  A("level_5", "Warming Up", "Reach level 5", "Levels", "bronze", "level", 5),
  A("level_10", "Finding Rhythm", "Reach level 10", "Levels", "silver", "level", 10),
  A("level_25", "Committed", "Reach level 25", "Levels", "gold", "level", 25),
  A("level_50", "Halfway There", "Reach level 50", "Levels", "gold", "level", 50),
  A("level_70", "Relentless", "Reach level 70", "Levels", "platinum", "level", 70),
  A("level_90", "Mastery", "Reach level 90", "Levels", "platinum", "level", 90),
];

/** Progress toward a locked badge — null for compound badges. */
export function achievementProgress(
  a: Achievement,
  s: AchievementStats,
): { current: number; target: number; pct: number } | null {
  if (!a.stat || !a.target) return null;
  const current = Math.max(0, Number(s[a.stat] ?? 0));
  return {
    current: Math.min(current, a.target),
    target: a.target,
    pct: Math.max(0, Math.min(100, Math.round((current / a.target) * 100))),
  };
}

export const ACHIEVEMENTS_BY_ID = new Map(ACHIEVEMENTS.map((a) => [a.id, a]));

/** Ids of every achievement the stats currently satisfy. */
export function earnedIds(stats: AchievementStats): string[] {
  return ACHIEVEMENTS.filter((a) => a.test(stats)).map((a) => a.id);
}

/** Bonus XP from a set of earned achievement ids. */
export function achievementXp(ids: Iterable<string>): number {
  let xp = 0;
  for (const id of ids) {
    const a = ACHIEVEMENTS_BY_ID.get(id);
    if (a) xp += TIERS[a.tier].xp;
  }
  return xp;
}
