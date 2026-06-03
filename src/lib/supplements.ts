export type Timing = "morning" | "preworkout" | "evening" | "anytime";

export type Supplement = {
  id: string;
  name: string;
  dose: string | null;
  timing: Timing;
  created_at: string;
};

export type SupplementLog = {
  id: string;
  supplement_id: string;
  taken_on: string;
};

export const TIMINGS: { id: Timing; label: string }[] = [
  { id: "morning", label: "Morning" },
  { id: "preworkout", label: "Pre-workout" },
  { id: "evening", label: "Evening" },
  { id: "anytime", label: "Anytime" },
];

export function timingLabel(id: string): string {
  return TIMINGS.find((t) => t.id === id)?.label ?? "Anytime";
}

export function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

export function todayYmd(): string {
  return ymd(new Date());
}

/** Last `n` days (oldest → newest) as YYYY-MM-DD, ending today. */
export function lastDays(n: number): string[] {
  const out: string[] = [];
  const d = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const x = new Date(d);
    x.setDate(d.getDate() - i);
    out.push(ymd(x));
  }
  return out;
}

export function weekdayLetter(iso: string): string {
  return ["S", "M", "T", "W", "T", "F", "S"][new Date(`${iso}T00:00:00`).getDay()];
}
