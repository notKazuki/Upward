/**
 * Sample data for the dashboard. This stands in for real tracked data until
 * Supabase tables are wired up. Shapes are intentionally simple and typed so
 * the swap to live data later is mechanical.
 */

export type DayPoint = { day: string; minutes: number };
export type CategoryCount = { category: string; sessions: number };
export type Macro = { name: string; grams: number };
export type MoodPoint = { day: string; mood: number };
export type Goal = { id: string; label: string; done: boolean };

export const stats = {
  streakDays: 5,
  workoutMinutesThisWeek: 270,
  workoutMinutesLastWeek: 225,
  supplementAdherence: 0.6, // 0..1
  goalsTotal: 5,
  goalsDone: 2,
  topCategory: "Strength",
  avgMood: 3.8, // out of 5
};

export const weeklyActivity: DayPoint[] = [
  { day: "Mon", minutes: 30 },
  { day: "Tue", minutes: 45 },
  { day: "Wed", minutes: 0 },
  { day: "Thu", minutes: 60 },
  { day: "Fri", minutes: 40 },
  { day: "Sat", minutes: 75 },
  { day: "Sun", minutes: 20 },
];

export const workoutsByCategory: CategoryCount[] = [
  { category: "Strength", sessions: 8 },
  { category: "Cardio", sessions: 5 },
  { category: "Mobility", sessions: 3 },
  { category: "Sport", sessions: 2 },
];

export const macros: Macro[] = [
  { name: "Protein", grams: 140 },
  { name: "Carbs", grams: 210 },
  { name: "Fat", grams: 70 },
];

export const moodTrend: MoodPoint[] = [
  { day: "Mon", mood: 3 },
  { day: "Tue", mood: 4 },
  { day: "Wed", mood: 3 },
  { day: "Thu", mood: 4 },
  { day: "Fri", mood: 5 },
  { day: "Sat", mood: 4 },
  { day: "Sun", mood: 4 },
];

export const sampleGoals: Goal[] = [
  { id: "g1", label: "Train 4 times this week", done: true },
  { id: "g2", label: "Hit 140g protein daily", done: true },
  { id: "g3", label: "Sleep 7+ hours", done: false },
  { id: "g4", label: "10k steps a day", done: false },
  { id: "g5", label: "Take supplements every morning", done: false },
];

/** Day numbers (1-based) in the current month that have logged activity. */
export const activeDaysThisMonth = [2, 3, 5, 8, 9, 11, 12, 15, 16, 18, 22, 23, 25, 26];

/* ------------------------------------------------------------------ *
 * Summary generation — plain code, no AI. Turns the numbers above into
 * a short, readable narrative with key figures flagged for emphasis.
 * ------------------------------------------------------------------ */

export type SummaryToken = { t: string; em?: boolean };

export function generateSummary(): SummaryToken[] {
  const tokens: SummaryToken[] = [];
  const push = (t: string, em = false) => tokens.push({ t, em });

  const {
    streakDays,
    workoutMinutesThisWeek,
    workoutMinutesLastWeek,
    supplementAdherence,
    goalsTotal,
    goalsDone,
    topCategory,
    avgMood,
  } = stats;

  // Streak
  if (streakDays > 0) {
    push("You're on a ");
    push(`${streakDays}-day streak`, true);
    push(". ");
  }

  // Training volume vs last week
  const delta = workoutMinutesThisWeek - workoutMinutesLastWeek;
  const pct =
    workoutMinutesLastWeek > 0
      ? Math.round((delta / workoutMinutesLastWeek) * 100)
      : 0;
  if (pct > 0) {
    push("Training volume is ");
    push(`up ${pct}%`, true);
    push(" on last week, led by ");
    push(`${topCategory.toLowerCase()}`, true);
    push(" sessions. ");
  } else if (pct < 0) {
    push("Training volume is ");
    push(`down ${Math.abs(pct)}%`, true);
    push(" from last week — an easy place to gain ground. ");
  } else {
    push("Training volume held steady with last week. ");
  }

  // Supplement adherence
  const adherencePct = Math.round(supplementAdherence * 100);
  if (adherencePct < 70) {
    push("Supplement adherence slipped to ");
    push(`${adherencePct}%`, true);
    push(" — worth a small nudge. ");
  } else {
    push("Supplements are on track at ");
    push(`${adherencePct}%`, true);
    push(". ");
  }

  // Mood
  if (avgMood >= 4) {
    push("Mood is trending ");
    push("positive", true);
    push(" this week. ");
  } else if (avgMood <= 2.5) {
    push("Mood has dipped — be gentle with yourself. ");
  }

  // Goals
  push("You've completed ");
  push(`${goalsDone} of ${goalsTotal}`, true);
  push(" goals so far.");

  return tokens;
}
