import { displayDay } from "./workouts";

/* ------------------------------------------------------------------ *
 * Row shapes (subset of columns the dashboard reads)
 * ------------------------------------------------------------------ */
export type WorkoutRow = {
  performed_on: string;
  category: string;
  duration_min: number | null;
};
export type SessionRow = {
  game_id: string;
  played_on: string;
  matches: number;
  wins: number;
  losses: number;
  minutes: number;
};
export type GoalSet = { matches?: number; wins?: number; hours?: number };
export type GameRow = {
  id: string;
  name: string;
  goals: { weekly?: GoalSet; daily?: GoalSet } | null;
};

/* ------------------------------------------------------------------ *
 * Local date helpers (local calendar day, matches the pickers)
 * ------------------------------------------------------------------ */
function fmt(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}
function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}
function startOfWeek(d: Date): Date {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  r.setDate(r.getDate() - ((r.getDay() + 6) % 7)); // Monday
  return r;
}

const sum = <T>(arr: T[], f: (x: T) => number | null | undefined) =>
  arr.reduce((a, x) => a + (f(x) || 0), 0);

function winRate(w: number, l: number): number | null {
  return w + l > 0 ? Math.round((w / (w + l)) * 100) : null;
}

function daysSince(dates: string[], today: Date): number | null {
  if (dates.length === 0) return null;
  const max = dates.reduce((a, b) => (a > b ? a : b));
  const diff = Math.round(
    (today.getTime() - new Date(`${max}T00:00:00`).getTime()) / 86_400_000,
  );
  return diff;
}

export const WEEK_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export type GoalProgress = {
  game: string;
  metric: "matches" | "wins" | "hours";
  value: number;
  target: number;
  pct: number;
};

export type Aggregates = ReturnType<typeof aggregate>;

export type Nutrition = {
  hasMeals: boolean;
  caloriesToday: number;
  proteinToday: number;
  calTarget?: number;
  proteinTarget?: number;
};

export function aggregate(
  workouts: WorkoutRow[],
  sessions: SessionRow[],
  games: GameRow[],
  workoutDays: string[] = [],
  nutrition: Nutrition = { hasMeals: false, caloriesToday: 0, proteinToday: 0 },
  // The user's local "today" (YYYY-MM-DD). Defaults to the runtime's date, but
  // callers pass a timezone-correct value so week/today don't drift on UTC.
  todayStr: string = fmt(new Date()),
  // Dates of OTHER tracked activity (meals, journal, supplements, goal
  // check-ins) so the streak rewards "did anything today", not just
  // workouts/gaming. Forgiving by design — see review feedback.
  extraActiveDates: string[] = [],
) {
  const today = new Date(`${todayStr}T00:00:00`);
  const weekStart = startOfWeek(today);
  const weekStartStr = fmt(weekStart);
  const lastWeekStartStr = fmt(addDays(weekStart, -7));

  const wWeek = workouts.filter((w) => w.performed_on >= weekStartStr);
  const wLast = workouts.filter(
    (w) => w.performed_on >= lastWeekStartStr && w.performed_on < weekStartStr,
  );
  const sWeek = sessions.filter((s) => s.played_on >= weekStartStr);
  const sLast = sessions.filter(
    (s) => s.played_on >= lastWeekStartStr && s.played_on < weekStartStr,
  );

  // --- weekly aggregates ---
  const workoutMinWeek = sum(wWeek, (w) => w.duration_min);
  const workoutMinLast = sum(wLast, (w) => w.duration_min);
  const gameMinWeek = sum(sWeek, (s) => s.minutes);
  const matchesWeek = sum(sWeek, (s) => s.matches);
  const winsWeek = sum(sWeek, (s) => s.wins);
  const lossesWeek = sum(sWeek, (s) => s.losses);
  const winsLast = sum(sLast, (s) => s.wins);
  const lossesLast = sum(sLast, (s) => s.losses);

  // --- per-day minutes (Mon..Sun, workouts + gaming) ---
  const perDayMinutes = WEEK_LABELS.map((day, i) => {
    const dStr = fmt(addDays(weekStart, i));
    const minutes =
      sum(
        workouts.filter((w) => w.performed_on === dStr),
        (w) => w.duration_min,
      ) +
      sum(
        sessions.filter((s) => s.played_on === dStr),
        (s) => s.minutes,
      );
    return { day, minutes };
  });
  const peakDay = perDayMinutes.reduce(
    (best, d) => (d.minutes > best.minutes ? d : best),
    { day: "", minutes: 0 },
  );

  // --- workouts by type (whole window) ---
  const catMap = new Map<string, number>();
  for (const w of workouts) {
    const label = displayDay(w.category);
    catMap.set(label, (catMap.get(label) ?? 0) + 1);
  }
  const workoutsByCategory = [...catMap.entries()]
    .map(([category, sessions]) => ({ category, sessions }))
    .sort((a, b) => b.sessions - a.sessions)
    .slice(0, 6);
  const topCategory = workoutsByCategory[0]?.category ?? null;

  // --- matches by game (this week) ---
  const nameById = new Map(games.map((g) => [g.id, g.name]));
  const gameMatch = new Map<string, number>();
  for (const s of sWeek)
    gameMatch.set(s.game_id, (gameMatch.get(s.game_id) ?? 0) + s.matches);
  const matchesByGame = [...gameMatch.entries()]
    .map(([id, matches]) => ({ game: nameById.get(id) ?? "Game", matches }))
    .filter((x) => x.matches > 0)
    .sort((a, b) => b.matches - a.matches)
    .slice(0, 6);

  // --- streak (consecutive active days ending today or yesterday) ---
  // "Active" = logged anything, anywhere: workout, gaming, meal, journal,
  // supplement, or goal check-in.
  const activeDates = new Set<string>([
    ...workouts.map((w) => w.performed_on),
    ...sessions.map((s) => s.played_on),
    ...extraActiveDates,
  ]);
  let streakDays = 0;
  let cursor = new Date(today);
  if (!activeDates.has(fmt(cursor))) cursor = addDays(cursor, -1); // grace for today
  while (activeDates.has(fmt(cursor))) {
    streakDays++;
    cursor = addDays(cursor, -1);
  }

  // --- active days this month (for the mini calendar) ---
  const activeDaysThisMonth = [...activeDates]
    .map((d) => new Date(`${d}T00:00:00`))
    .filter(
      (d) => d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear(),
    )
    .map((d) => d.getDate());

  // --- recency ---
  const daysSinceWorkout = daysSince(
    workouts.map((w) => w.performed_on),
    today,
  );
  const daysSinceActivity = daysSince([...activeDates], today);

  // --- neglected split day (longest since logged, among days actually trained
  // before) + untrained split day (never logged at all — phrased differently;
  // never compute a day-count against nothing, that's how "999 days" leaks).
  let neglectedDay: { day: string; days: number } | null = null;
  let untrainedDay: string | null = null;
  if (workoutDays.length > 0 && workouts.length > 0) {
    for (const day of workoutDays) {
      const dates = workouts
        .filter((w) => w.category === day)
        .map((w) => w.performed_on);
      if (dates.length === 0) {
        untrainedDay ??= day;
        continue;
      }
      const since = daysSince(dates, today);
      if ((since ?? 0) >= 7 && (!neglectedDay || since! > neglectedDay.days)) {
        neglectedDay = { day, days: since! };
      }
    }
  }

  // --- gaming weekly goal progress ---
  const goalProgress: GoalProgress[] = [];
  for (const g of games) {
    const weekly = g.goals?.weekly;
    if (!weekly) continue;
    const gs = sWeek.filter((s) => s.game_id === g.id);
    const totals = {
      matches: sum(gs, (s) => s.matches),
      wins: sum(gs, (s) => s.wins),
      hours: sum(gs, (s) => s.minutes) / 60,
    };
    (["matches", "wins", "hours"] as const).forEach((metric) => {
      const target = weekly[metric];
      if (!target || target <= 0) return;
      const value = metric === "hours" ? totals.hours : totals[metric];
      goalProgress.push({
        game: g.name,
        metric,
        value: Math.round(value * 10) / 10,
        target,
        pct: Math.min(100, Math.round((value / target) * 100)),
      });
    });
  }

  return {
    todayStr,
    hasWorkouts: workouts.length > 0,
    hasGaming: sessions.length > 0,
    hasAny: workouts.length > 0 || sessions.length > 0,
    loggedToday: activeDates.has(todayStr),

    streakDays,
    activeDaysThisMonth,
    daysSinceWorkout,
    daysSinceActivity,
    neglectedDay,
    untrainedDay,

    week: {
      workoutCount: wWeek.length,
      workoutMin: workoutMinWeek,
      gameSessions: sWeek.length,
      gameMin: gameMinWeek,
      activeMin: workoutMinWeek + gameMinWeek,
      matches: matchesWeek,
      wins: winsWeek,
      losses: lossesWeek,
      winRate: winRate(winsWeek, lossesWeek),
    },
    lastWeek: {
      workoutCount: wLast.length,
      workoutMin: workoutMinLast,
      winRate: winRate(winsLast, lossesLast),
    },

    perDayMinutes,
    peakDay,
    workoutsByCategory,
    topCategory,
    matchesByGame,
    goalProgress,
    nutrition,

    totals: {
      workouts: workouts.length,
      gameSessions: sessions.length,
    },
  };
}

/* ------------------------------------------------------------------ *
 * Stat cards — adapt to what the user actually tracks
 * ------------------------------------------------------------------ */
export type StatCard = { label: string; value: string; suffix: string; icon: string };

export function statCards(a: Aggregates): StatCard[] {
  const cards: StatCard[] = [
    {
      label: "Day streak",
      value: `${a.streakDays}`,
      suffix: a.streakDays === 1 ? "day" : "days",
      icon: "flame",
    },
    {
      label: "Active",
      value: `${a.week.activeMin}`,
      suffix: "min this week",
      icon: "trendUp",
    },
  ];

  if (a.nutrition.hasMeals) {
    cards.push({
      label: "Calories",
      value: `${a.nutrition.caloriesToday}`,
      suffix: a.nutrition.calTarget
        ? `of ${a.nutrition.calTarget} today`
        : "today",
      icon: "meal",
    });
  }
  if (a.hasWorkouts) {
    cards.push({
      label: "Workouts",
      value: `${a.week.workoutCount}`,
      suffix: "this week",
      icon: "workout",
    });
  }
  if (a.hasGaming) {
    cards.push({
      label: "Win rate",
      value: a.week.winRate !== null ? `${a.week.winRate}%` : "—",
      // A bare em-dash reads as broken; say why it's empty.
      suffix: a.week.winRate !== null ? "this week" : "no matches this week",
      icon: "gaming",
    });
  }
  // Always show four cards; pad with all-time sessions if needed.
  if (cards.length < 4) {
    cards.push({
      label: "Sessions",
      value: `${a.totals.workouts + a.totals.gameSessions}`,
      suffix: "all time",
      icon: "dashboard",
    });
  }
  return cards.slice(0, 4);
}
