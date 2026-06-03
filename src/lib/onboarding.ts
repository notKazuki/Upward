export const MIN_AGE = 13;

export type Gender = "male" | "female" | "unspecified";
export type UnitPref = "metric" | "imperial";

/** Short unit labels driven by the user's preference. */
export function weightUnit(p: UnitPref | null | undefined): string {
  return p === "imperial" ? "lb" : "kg";
}
export function heightUnit(p: UnitPref | null | undefined): string {
  return p === "imperial" ? "in" : "cm";
}

export type Profile = {
  id: string;
  full_name: string | null;
  dob: string | null;
  gender: Gender | null;
  height_cm: number | null;
  weight_kg: number | null;
  unit_pref: UnitPref;
  uses: string[];
  onboarded: boolean;
};

/** Use cases shown on the final onboarding step (spans many audiences). */
export const USE_CASES: { id: string; label: string; hint: string }[] = [
  { id: "fitness", label: "Fitness & Training", hint: "Workouts, PRs, steps" },
  { id: "nutrition", label: "Nutrition & Diet", hint: "Meals, calories, macros" },
  { id: "supplements", label: "Supplements", hint: "Stacks & adherence" },
  { id: "gaming", label: "Gaming", hint: "Play time, ranks, goals" },
  { id: "work", label: "Work & Productivity", hint: "Focus, tasks, output" },
  { id: "learning", label: "Learning & Skills", hint: "Study, practice, progress" },
  { id: "finance", label: "Money & Finance", hint: "Spending, saving, goals" },
  { id: "mood", label: "Mind & Mood", hint: "Mood, journaling, stress" },
  { id: "sleep", label: "Sleep & Recovery", hint: "Sleep, rest, energy" },
  { id: "habits", label: "Habits & Routines", hint: "Streaks, daily rituals" },
  { id: "creative", label: "Creativity & Hobbies", hint: "Projects, practice" },
];

/** Whole years between dob (ISO date) and today. */
export function ageFromDob(dob: string): number {
  const d = new Date(dob);
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age;
}

/* Unit conversions — canonical storage is cm + kg. */
export function ftInToCm(ft: number, inch: number): number {
  return Math.round((ft * 30.48 + inch * 2.54) * 10) / 10;
}
export function cmToFtIn(cm: number): { ft: number; inch: number } {
  const totalIn = cm / 2.54;
  const ft = Math.floor(totalIn / 12);
  const inch = Math.round(totalIn - ft * 12);
  return { ft, inch };
}
export function lbToKg(lb: number): number {
  return Math.round(lb * 0.453592 * 10) / 10;
}
export function kgToLb(kg: number): number {
  return Math.round(kg / 0.453592);
}
