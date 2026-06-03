export type GoalType = "binary" | "numeric" | "streak";
export type GoalStatus = "active" | "completed" | "paused" | "abandoned";

export type Goal = {
  id: string;
  title: string;
  description: string | null;
  category: string;
  type: GoalType;
  target_value: number | null;
  unit: string | null;
  start_date: string;
  deadline: string | null;
  why: string | null;
  status: GoalStatus;
  created_at: string;
};

export type GoalLog = {
  id: string;
  goal_id: string;
  logged_on: string;
  value: number | null;
  note: string | null;
  created_at: string;
};

export const CATEGORIES: { id: string; label: string; color: string }[] = [
  { id: "fitness", label: "Fitness", color: "#bc572f" },
  { id: "health", label: "Health", color: "#7c9473" },
  { id: "finance", label: "Finance", color: "#c9a23f" },
  { id: "career", label: "Career", color: "#5f8aa8" },
  { id: "learning", label: "Learning", color: "#9a6a8a" },
  { id: "habits", label: "Habits", color: "#d4825a" },
  { id: "other", label: "Other", color: "#a89e8f" },
];

export function categoryMeta(id: string) {
  return CATEGORIES.find((c) => c.id === id) ?? CATEGORIES[CATEGORIES.length - 1];
}

export const GOAL_TYPES: { id: GoalType; label: string; hint: string }[] = [
  { id: "numeric", label: "Measurable", hint: "Count toward a target — e.g. run 100 miles" },
  { id: "streak", label: "Streak", hint: "Consecutive days — e.g. 30 days in a row" },
  { id: "binary", label: "Done / not done", hint: "A one-off you complete once" },
];

export function goalTypeLabel(id: string) {
  return GOAL_TYPES.find((t) => t.id === id)?.label ?? id;
}

export const STATUSES: { id: GoalStatus; label: string }[] = [
  { id: "active", label: "Active" },
  { id: "completed", label: "Completed" },
  { id: "paused", label: "Paused" },
  { id: "abandoned", label: "Abandoned" },
];

export function statusLabel(id: string) {
  return STATUSES.find((s) => s.id === id)?.label ?? id;
}

// --- date helpers (local time, YYYY-MM-DD) ---------------------------------
export function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}
export function todayYmd(): string {
  return ymd(new Date());
}

/** Sum of logged values toward a numeric target. */
export function numericTotal(logs: GoalLog[]): number {
  return logs.reduce((s, l) => s + (l.value ?? 0), 0);
}

/**
 * Consecutive-day streak ending today (or yesterday, so a streak isn't "broken"
 * just because you haven't checked in yet today).
 */
export function currentStreak(logs: GoalLog[]): number {
  const days = new Set(logs.map((l) => l.logged_on));
  const d = new Date();
  let cursor = ymd(d);
  if (!days.has(cursor)) {
    d.setDate(d.getDate() - 1);
    cursor = ymd(d);
    if (!days.has(cursor)) return 0;
  }
  let streak = 0;
  while (days.has(cursor)) {
    streak++;
    d.setDate(d.getDate() - 1);
    cursor = ymd(d);
  }
  return streak;
}

/** The goal's current measured value, by type. */
export function currentValue(goal: Goal, logs: GoalLog[]): number {
  if (goal.type === "numeric") return numericTotal(logs);
  if (goal.type === "streak") return currentStreak(logs);
  return goal.status === "completed" ? 1 : 0;
}

export function progressPct(goal: Goal, logs: GoalLog[]): number {
  if (goal.type === "binary") return goal.status === "completed" ? 100 : 0;
  const target = goal.target_value ?? 0;
  if (target <= 0) return 0;
  return Math.min(100, Math.round((currentValue(goal, logs) / target) * 100));
}

/** Whether logs have reached the target (used for auto-complete + celebration). */
export function isTargetMet(goal: Goal, logs: GoalLog[]): boolean {
  if (goal.type === "binary") return goal.status === "completed";
  const target = goal.target_value ?? 0;
  return target > 0 && currentValue(goal, logs) >= target;
}

export type DeadlineState = "none" | "overdue" | "soon" | "ok";

export function deadlineState(goal: Goal): DeadlineState {
  if (!goal.deadline || goal.status !== "active") return "none";
  const today = todayYmd();
  if (goal.deadline < today) return "overdue";
  const diffDays =
    (new Date(goal.deadline).getTime() - new Date(today).getTime()) / 86400000;
  return diffDays <= 7 ? "soon" : "ok";
}

export function formatValue(goal: Goal, value: number): string {
  const unit = goal.unit ? ` ${goal.unit}` : "";
  // keep one decimal only when it isn't a whole number
  const v = Number.isInteger(value) ? value : Math.round(value * 10) / 10;
  return `${v}${unit}`;
}

export function formatDate(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
