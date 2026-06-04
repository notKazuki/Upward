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

export type Achievement = {
  id: string;
  label: string;
  description: string;
  category: "Training" | "Nutrition" | "Mind" | "Gaming" | "Goals" | "Supplements" | "Social" | "Rank";
  tier: Tier;
  test: (s: AchievementStats) => boolean;
};

const A = (
  id: string,
  label: string,
  description: string,
  category: Achievement["category"],
  tier: Tier,
  test: Achievement["test"],
): Achievement => ({ id, label, description, category, tier, test });

export const ACHIEVEMENTS: Achievement[] = [
  // Training
  A("workout_1", "First Rep", "Log your first workout", "Training", "bronze", (s) => s.workouts >= 1),
  A("workout_10", "Getting Consistent", "Log 10 workouts", "Training", "bronze", (s) => s.workouts >= 10),
  A("workout_50", "Committed", "Log 50 workouts", "Training", "silver", (s) => s.workouts >= 50),
  A("workout_100", "Centurion", "Log 100 workouts", "Training", "gold", (s) => s.workouts >= 100),
  A("workout_250", "Iron Devotee", "Log 250 workouts", "Training", "gold", (s) => s.workouts >= 250),
  A("streak_7", "Week Warrior", "A 7-day activity streak", "Training", "bronze", (s) => s.longestStreak >= 7),
  A("streak_30", "Unbroken", "A 30-day activity streak", "Training", "silver", (s) => s.longestStreak >= 30),
  A("streak_100", "Relentless", "A 100-day activity streak", "Training", "platinum", (s) => s.longestStreak >= 100),

  // Nutrition
  A("meal_1", "First Bite", "Log your first meal", "Nutrition", "bronze", (s) => s.mealDaysLogged >= 1),
  A("meal_7", "Tracking In", "Log meals on 7 days", "Nutrition", "bronze", (s) => s.mealDaysLogged >= 7),
  A("meal_30", "Macro Minded", "Log meals on 30 days", "Nutrition", "silver", (s) => s.mealDaysLogged >= 30),
  A("meal_100", "Nutrition Nerd", "Log meals on 100 days", "Nutrition", "gold", (s) => s.mealDaysLogged >= 100),
  A("protein_7", "Protein Pact", "Hit your protein target 7 days", "Nutrition", "bronze", (s) => s.proteinHitDays >= 7),
  A("protein_30", "Anabolic", "Hit your protein target 30 days", "Nutrition", "silver", (s) => s.proteinHitDays >= 30),

  // Mind
  A("journal_1", "Dear Diary", "Write your first journal entry", "Mind", "bronze", (s) => s.journalEntries >= 1),
  A("journal_7", "Reflective", "Write 7 journal entries", "Mind", "bronze", (s) => s.journalEntries >= 7),
  A("journal_30", "Inner Work", "Write 30 journal entries", "Mind", "silver", (s) => s.journalEntries >= 30),
  A("journal_100", "Chronicler", "Write 100 journal entries", "Mind", "gold", (s) => s.journalEntries >= 100),

  // Gaming
  A("gaming_1", "Game On", "Log your first match", "Gaming", "bronze", (s) => s.gamingMatches >= 1),
  A("gaming_100", "Grinder", "Log 100 matches", "Gaming", "silver", (s) => s.gamingMatches >= 100),
  A("gaming_1000", "Veteran", "Log 1,000 matches", "Gaming", "gold", (s) => s.gamingMatches >= 1000),
  A("gaming_wr", "Sharpshooter", "55%+ win rate over 50+ games", "Gaming", "silver", (s) => s.gamingDecided >= 50 && (s.gamingWinRate ?? 0) >= 55),

  // Goals
  A("goal_done_1", "Done and Dusted", "Complete a goal", "Goals", "bronze", (s) => s.goalsCompleted >= 1),
  A("goal_done_5", "Goal Getter", "Complete 5 goals", "Goals", "silver", (s) => s.goalsCompleted >= 5),
  A("goal_done_10", "Achiever", "Complete 10 goals", "Goals", "gold", (s) => s.goalsCompleted >= 10),
  A("goal_done_25", "Unstoppable", "Complete 25 goals", "Goals", "platinum", (s) => s.goalsCompleted >= 25),
  A("goal_make_5", "Dreamer", "Set 5 goals", "Goals", "bronze", (s) => s.goalsCreated >= 5),
  A("goal_make_10", "Visionary", "Set 10 goals", "Goals", "silver", (s) => s.goalsCreated >= 10),

  // Supplements
  A("supp_7", "Stacked", "7 perfect supplement days", "Supplements", "bronze", (s) => s.supplementPerfectDays >= 7),
  A("supp_30", "Routine", "30 perfect supplement days", "Supplements", "silver", (s) => s.supplementPerfectDays >= 30),
  A("supp_100", "Religiously", "100 perfect supplement days", "Supplements", "gold", (s) => s.supplementPerfectDays >= 100),

  // Social
  A("friend_1", "Not Alone", "Add your first friend", "Social", "bronze", (s) => s.friends >= 1),
  A("friends_5", "Squad", "Reach 5 friends", "Social", "silver", (s) => s.friends >= 5),
  A("friends_10", "Connected", "Reach 10 friends", "Social", "gold", (s) => s.friends >= 10),

  // Rank
  A("level_5", "Warming Up", "Reach level 5", "Rank", "bronze", (s) => s.level >= 5),
  A("level_10", "Foothills", "Reach level 10", "Rank", "silver", (s) => s.level >= 10),
  A("level_25", "Climbing", "Reach level 25", "Rank", "gold", (s) => s.level >= 25),
  A("level_50", "Alpine Air", "Reach level 50", "Rank", "gold", (s) => s.level >= 50),
  A("rank_summit", "Summit Seeker", "Reach the Summit rank", "Rank", "platinum", (s) => s.level >= 70),
  A("rank_peak", "Peak", "Reach the Peak rank", "Rank", "platinum", (s) => s.level >= 90),
];

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
