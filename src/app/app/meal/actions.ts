"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { currentUser } from "@/lib/auth";
import type { MealType, Targets } from "@/lib/nutrition";

export type MealActionState = { ok?: boolean; error?: string; ts?: number };

const VALID: MealType[] = ["breakfast", "lunch", "dinner", "snack"];

export async function addMeal(
  _prev: MealActionState,
  formData: FormData,
): Promise<MealActionState> {
  const supabase = await createClient();
  const user = await currentUser();
  if (!user) return { error: "Your session expired. Please sign in again." };

  const name = String(formData.get("name") ?? "").trim();
  const meal_type = String(formData.get("meal_type") ?? "") as MealType;
  const eaten_on = String(formData.get("eaten_on") ?? "");
  const int = (k: string) => {
    const n = Math.round(Number(String(formData.get(k) ?? "").trim() || "0"));
    return Number.isFinite(n) && n >= 0 ? n : 0;
  };

  if (!name) return { error: "Give the meal a name." };
  if (!VALID.includes(meal_type)) return { error: "Pick a meal type." };
  if (!eaten_on) return { error: "Pick a date." };

  const { error } = await supabase.from("meals").insert({
    user_id: user.id,
    name,
    meal_type,
    eaten_on,
    calories: int("calories"),
    protein: int("protein"),
    carbs: int("carbs"),
    fat: int("fat"),
  });

  if (error) {
    return {
      error: "Couldn't save. Make sure you've run supabase/meals.sql.",
    };
  }

  revalidatePath("/app/meal");
  revalidatePath("/app");
  return { ok: true, ts: Date.now() };
}

export async function deleteMeal(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const user = await currentUser();
  if (!user) return;
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await supabase.from("meals").delete().eq("id", id).eq("user_id", user.id);
  revalidatePath("/app/meal");
  revalidatePath("/app");
}

export async function updateTargets(
  targets: Targets,
): Promise<{ ok?: boolean; error?: string }> {
  const supabase = await createClient();
  const user = await currentUser();
  if (!user) return { error: "Session expired." };

  const clean: Targets = {};
  (["calories", "protein", "carbs", "fat"] as const).forEach((k) => {
    const v = targets[k];
    if (typeof v === "number" && Number.isFinite(v) && v >= 0)
      clean[k] = Math.round(v);
  });

  const { error } = await supabase
    .from("profiles")
    .update({ nutrition_targets: clean })
    .eq("id", user.id);

  if (error) return { error: "Couldn't save targets." };
  revalidatePath("/app/meal");
  revalidatePath("/app");
  return { ok: true };
}
