import type { SessionRow, WorkoutRow } from "./dashboard";

export type MealRow = { eaten_on: string; calories: number; protein: number };

export type Period = "month" | "90d";
export const PERIODS: { id: Period; label: string; days: number }[] = [
  { id: "month", label: "Last 30 days", days: 30 },
  { id: "90d", label: "Last 90 days", days: 90 },
];

export function periodMeta(id: string) {
  return PERIODS.find((p) => p.id === id) ?? PERIODS[0];
}

// --- local date helpers ----------------------------------------------------
function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}
function parse(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
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

/** Start date (YYYY-MM-DD) for a rolling window of `days` ending at `today`. */
export function windowStart(todayStr: string, days: number): string {
  return ymd(addDays(parse(todayStr), -(days - 1)));
}

const within = (date: string, start: string, end: string) =>
  date >= start && date <= end;

// --- period stats ----------------------------------------------------------
export type PeriodStats = {
  days: number;
  workouts: number;
  workoutHours: number;
  matches: number;
  gamingHours: number;
  winRate: number | null;
  activeDays: number;
  consistencyPct: number;
  avgCalories: number | null;
};

export function periodStats(
  workouts: WorkoutRow[],
  sessions: SessionRow[],
  meals: MealRow[],
  startStr: string,
  todayStr: string,
  days: number,
): PeriodStats {
  const w = workouts.filter((x) => within(x.performed_on, startStr, todayStr));
  const s = sessions.filter((x) => within(x.played_on, startStr, todayStr));
  const m = meals.filter((x) => within(x.eaten_on, startStr, todayStr));

  const workoutMin = w.reduce((a, x) => a + (x.duration_min || 0), 0);
  const gamingMin = s.reduce((a, x) => a + (x.minutes || 0), 0);
  const wins = s.reduce((a, x) => a + x.wins, 0);
  const losses = s.reduce((a, x) => a + x.losses, 0);
  const matches = s.reduce((a, x) => a + x.matches, 0);

  const active = new Set<string>();
  w.forEach((x) => active.add(x.performed_on));
  s.forEach((x) => active.add(x.played_on));

  // average calories over days that actually have meals logged
  const calByDay = new Map<string, number>();
  m.forEach((x) => calByDay.set(x.eaten_on, (calByDay.get(x.eaten_on) ?? 0) + (x.calories || 0)));
  const calDays = [...calByDay.values()];
  const avgCalories = calDays.length
    ? Math.round(calDays.reduce((a, b) => a + b, 0) / calDays.length)
    : null;

  return {
    days,
    workouts: w.length,
    workoutHours: Math.round((workoutMin / 60) * 10) / 10,
    matches,
    gamingHours: Math.round((gamingMin / 60) * 10) / 10,
    winRate: wins + losses > 0 ? Math.round((wins / (wins + losses)) * 100) : null,
    activeDays: active.size,
    consistencyPct: Math.round((active.size / days) * 100),
    avgCalories,
  };
}

// --- 12-week activity trend ------------------------------------------------
export function weeklyTrend(
  workouts: WorkoutRow[],
  sessions: SessionRow[],
  todayStr: string,
  weeks = 12,
): { day: string; minutes: number }[] {
  const thisWeekStart = startOfWeek(parse(todayStr));
  const out: { day: string; minutes: number }[] = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const ws = addDays(thisWeekStart, -7 * i);
    const we = addDays(ws, 6);
    const startS = ymd(ws);
    const endS = ymd(we);
    const wMin = workouts
      .filter((x) => within(x.performed_on, startS, endS))
      .reduce((a, x) => a + (x.duration_min || 0), 0);
    const gMin = sessions
      .filter((x) => within(x.played_on, startS, endS))
      .reduce((a, x) => a + (x.minutes || 0), 0);
    out.push({
      day: ws.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      minutes: wMin + gMin,
    });
  }
  return out;
}

// --- cross-tracker correlations -------------------------------------------
export type Insight = {
  id: string;
  title: string;
  detail: string;
  tone: "good" | "bad" | "neutral";
  locked?: boolean;
  hint?: string;
};

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const nf = (n: number) => n.toLocaleString();

export function correlations(
  workouts: WorkoutRow[],
  sessions: SessionRow[],
  meals: MealRow[],
  startStr: string,
  todayStr: string,
): Insight[] {
  const w = workouts.filter((x) => within(x.performed_on, startStr, todayStr));
  const s = sessions.filter((x) => within(x.played_on, startStr, todayStr));
  const m = meals.filter((x) => within(x.eaten_on, startStr, todayStr));

  const workoutDays = new Set(w.map((x) => x.performed_on));
  const out: Insight[] = [];

  // 1. Win rate — training days vs rest days
  {
    let wOn = 0, lOn = 0, wOff = 0, lOff = 0;
    for (const x of s) {
      if (workoutDays.has(x.played_on)) {
        wOn += x.wins;
        lOn += x.losses;
      } else {
        wOff += x.wins;
        lOff += x.losses;
      }
    }
    const decOn = wOn + lOn;
    const decOff = wOff + lOff;
    if (decOn >= 8 && decOff >= 8) {
      const rOn = Math.round((wOn / decOn) * 100);
      const rOff = Math.round((wOff / decOff) * 100);
      const diff = rOn - rOff;
      out.push({
        id: "winrate-training",
        title: "Training vs win rate",
        tone: diff > 1 ? "good" : diff < -1 ? "bad" : "neutral",
        detail:
          diff === 0
            ? `Your win rate is about the same on training and rest days (${rOn}%).`
            : `Your win rate is ${Math.abs(diff)} point${Math.abs(diff) === 1 ? "" : "s"} ${
                diff > 0 ? "higher" : "lower"
              } on days you train — ${rOn}% vs ${rOff}%.`,
      });
    } else {
      out.push({
        id: "winrate-training",
        title: "Training vs win rate",
        tone: "neutral",
        locked: true,
        detail: "",
        hint: "Log more workouts and gaming sessions to see if training lifts your win rate.",
      });
    }
  }

  // 2. Calories — training days vs rest days
  {
    const calByDay = new Map<string, number>();
    m.forEach((x) => calByDay.set(x.eaten_on, (calByDay.get(x.eaten_on) ?? 0) + (x.calories || 0)));
    const on: number[] = [], off: number[] = [];
    for (const [date, cal] of calByDay) {
      (workoutDays.has(date) ? on : off).push(cal);
    }
    if (on.length >= 4 && off.length >= 4) {
      const avgOn = Math.round(on.reduce((a, b) => a + b, 0) / on.length);
      const avgOff = Math.round(off.reduce((a, b) => a + b, 0) / off.length);
      const diff = avgOn - avgOff;
      out.push({
        id: "calories-training",
        title: "Training vs appetite",
        tone: "neutral",
        detail:
          Math.abs(diff) < 60
            ? `You eat about the same on training and rest days (~${nf(avgOn)} kcal).`
            : `You eat about ${nf(Math.abs(diff))} ${diff > 0 ? "more" : "fewer"} calories on training days — ${nf(avgOn)} vs ${nf(avgOff)}.`,
      });
    } else {
      out.push({
        id: "calories-training",
        title: "Training vs appetite",
        tone: "neutral",
        locked: true,
        detail: "",
        hint: "Log meals on more training and rest days to compare your intake.",
      });
    }
  }

  // 3. Consistency
  {
    const active = new Set<string>();
    w.forEach((x) => active.add(x.performed_on));
    s.forEach((x) => active.add(x.played_on));
    const days = Math.round(
      (parse(todayStr).getTime() - parse(startStr).getTime()) / 86_400_000,
    ) + 1;
    if (active.size > 0) {
      const pct = Math.round((active.size / days) * 100);
      out.push({
        id: "consistency",
        title: "Consistency",
        tone: pct >= 50 ? "good" : pct >= 25 ? "neutral" : "bad",
        detail: `You were active on ${active.size} of the last ${days} days — ${pct}% consistency.`,
      });
    }
  }

  // 4. Most active weekday
  {
    const byDow = new Array(7).fill(0);
    w.forEach((x) => (byDow[parse(x.performed_on).getDay()] += x.duration_min || 0));
    s.forEach((x) => (byDow[parse(x.played_on).getDay()] += x.minutes || 0));
    const total = byDow.reduce((a, b) => a + b, 0);
    if (total > 0) {
      let best = 0;
      for (let i = 1; i < 7; i++) if (byDow[i] > byDow[best]) best = i;
      out.push({
        id: "active-weekday",
        title: "Your rhythm",
        tone: "neutral",
        detail: `${WEEKDAYS[best]} is your most active day on average.`,
      });
    }
  }

  return out;
}
