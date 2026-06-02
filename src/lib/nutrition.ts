import { ageFromDob, type Gender } from "./onboarding";

export type MealType = "breakfast" | "lunch" | "dinner" | "snack";

export const MEAL_TYPES: { id: MealType; label: string }[] = [
  { id: "breakfast", label: "Breakfast" },
  { id: "lunch", label: "Lunch" },
  { id: "dinner", label: "Dinner" },
  { id: "snack", label: "Snack" },
];

export function mealTypeLabel(id: string): string {
  return MEAL_TYPES.find((m) => m.id === id)?.label ?? id;
}

export type Meal = {
  id: string;
  eaten_on: string;
  meal_type: MealType;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  created_at: string;
};

export type Targets = {
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
};

export const MACROS: { key: "protein" | "carbs" | "fat"; label: string; color: string }[] = [
  { key: "protein", label: "Protein", color: "#bc572f" },
  { key: "carbs", label: "Carbs", color: "#d4825a" },
  { key: "fat", label: "Fat", color: "#c9a23f" },
];

/**
 * Suggest daily targets from the onboarding profile using Mifflin–St Jeor
 * (light-activity TDEE). "Rather not say" uses a neutral average of the
 * male/female formulas. Returns null if height/weight/DOB are missing.
 */
export function suggestTargets(p: {
  dob: string | null;
  gender: Gender | null;
  height_cm: number | null;
  weight_kg: number | null;
}): Targets | null {
  if (!p.dob || !p.height_cm || !p.weight_kg) return null;
  const age = ageFromDob(p.dob);
  const base = 10 * p.weight_kg + 6.25 * p.height_cm - 5 * age;
  const offset = p.gender === "male" ? 5 : p.gender === "female" ? -161 : -78;
  const bmr = base + offset;
  const tdee = bmr * 1.375; // light activity
  const calories = Math.round(tdee / 10) * 10;
  const protein = Math.round(1.6 * p.weight_kg);
  const fat = Math.round((tdee * 0.25) / 9);
  const carbs = Math.max(0, Math.round((tdee - protein * 4 - fat * 9) / 4));
  return { calories, protein, carbs, fat };
}

/** Saved targets take priority; fall back to the suggestion per-field. */
export function effectiveTargets(
  saved: Targets | null | undefined,
  suggested: Targets | null,
): Targets {
  return {
    calories: saved?.calories ?? suggested?.calories,
    protein: saved?.protein ?? suggested?.protein,
    carbs: saved?.carbs ?? suggested?.carbs,
    fat: saved?.fat ?? suggested?.fat,
  };
}

export function sumMeals(meals: Meal[]) {
  return meals.reduce(
    (a, m) => ({
      calories: a.calories + m.calories,
      protein: a.protein + m.protein,
      carbs: a.carbs + m.carbs,
      fat: a.fat + m.fat,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );
}

export function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

export function pct(value: number, target: number | undefined): number {
  if (!target || target <= 0) return 0;
  return Math.min(100, Math.round((value / target) * 100));
}
