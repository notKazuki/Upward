export type EventType = "workout" | "meal" | "gaming" | "goal" | "other";

export const EVENT_TYPES: { id: EventType; label: string; color: string }[] = [
  { id: "workout", label: "Workout", color: "#bc572f" },
  { id: "meal", label: "Meal", color: "#7c9473" },
  { id: "gaming", label: "Gaming", color: "#9a6a8a" },
  { id: "goal", label: "Goal", color: "#c9a23f" },
  { id: "other", label: "Other", color: "#5f8aa8" },
];

export function eventColor(t: string): string {
  return EVENT_TYPES.find((e) => e.id === t)?.color ?? "#7c7367";
}
export function eventLabel(t: string): string {
  return EVENT_TYPES.find((e) => e.id === t)?.label ?? t;
}

export type CalendarEvent = {
  id: string;
  date: string; // YYYY-MM-DD
  time: string | null; // HH:MM[:SS]
  type: EventType;
  title: string;
  notes: string | null;
  done: boolean;
};

/** Activity presence (day-of-month numbers) pulled from the trackers. */
export type MonthActivity = {
  workouts: number[];
  meals: number[];
  gaming: number[];
};

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function parseMonth(monthStr: string): { year: number; month0: number } {
  const [y, m] = monthStr.split("-").map(Number);
  return { year: y, month0: m - 1 };
}

export function monthKey(year: number, month0: number): string {
  return `${year}-${String(month0 + 1).padStart(2, "0")}`;
}

export function shiftMonth(monthStr: string, delta: number): string {
  const { year, month0 } = parseMonth(monthStr);
  const d = new Date(year, month0 + delta, 1);
  return monthKey(d.getFullYear(), d.getMonth());
}

export function monthLabel(monthStr: string): string {
  const { year, month0 } = parseMonth(monthStr);
  return `${MONTHS[month0]} ${year}`;
}

export function ymd(year: number, month0: number, day: number): string {
  return `${year}-${String(month0 + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function monthRange(monthStr: string): { start: string; end: string } {
  const { year, month0 } = parseMonth(monthStr);
  const days = new Date(year, month0 + 1, 0).getDate();
  return { start: ymd(year, month0, 1), end: ymd(year, month0, days) };
}

/** Leading blanks (Sunday-first) + day numbers for a month grid. */
export function monthCells(monthStr: string): (number | null)[] {
  const { year, month0 } = parseMonth(monthStr);
  const firstWeekday = new Date(year, month0, 1).getDay();
  const days = new Date(year, month0 + 1, 0).getDate();
  return [
    ...Array(firstWeekday).fill(null),
    ...Array.from({ length: days }, (_, i) => i + 1),
  ];
}

export function todayKey(): string {
  const d = new Date();
  return monthKey(d.getFullYear(), d.getMonth());
}
export function todayYmd(): string {
  const d = new Date();
  return ymd(d.getFullYear(), d.getMonth(), d.getDate());
}
