"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { currentUser } from "@/lib/auth";
import type { FoodItem, Goal, MealType, Targets } from "@/lib/nutrition";
import { searchUsda } from "@/lib/usda";
import type { Food } from "@/lib/food-db";

/** Live food search (USDA FoodData Central). Server action so the API key
 * stays server-side; signed-in only to protect the shared key. */
export async function searchFoodsLive(query: string): Promise<Food[]> {
  const user = await currentUser();
  if (!user) return [];
  return searchUsda(query, 8);
}

const GOALS: Goal[] = ["lose", "maintain", "gain"];

const VALID: MealType[] = ["breakfast", "lunch", "dinner", "snack"];

function cleanItems(items: FoodItem[]): FoodItem[] {
  const n = (v: unknown) => {
    const x = Math.round(Number(v));
    return Number.isFinite(x) && x >= 0 ? x : 0;
  };
  return (items ?? [])
    .map((i) => ({
      name: String(i?.name ?? "").trim().slice(0, 80),
      calories: n(i?.calories),
      protein: n(i?.protein),
      carbs: n(i?.carbs),
      fat: n(i?.fat),
    }))
    .filter((i) => i.name.length > 0)
    .slice(0, 30);
}

export async function logMeal(input: {
  mealType: string;
  date: string;
  items: FoodItem[];
}): Promise<{ ok?: boolean; error?: string }> {
  const supabase = await createClient();
  const user = await currentUser();
  if (!user) return { error: "Your session expired. Please sign in again." };

  const mealType = input.mealType as MealType;
  if (!VALID.includes(mealType)) return { error: "Pick a meal type." };
  if (!input.date) return { error: "Pick a date." };
  const items = cleanItems(input.items);
  if (items.length === 0) return { error: "Add at least one item." };

  const rows = items.map((i) => ({
    user_id: user.id,
    meal_type: mealType,
    eaten_on: input.date,
    name: i.name,
    calories: i.calories,
    protein: i.protein,
    carbs: i.carbs,
    fat: i.fat,
  }));

  const { error } = await supabase.from("meals").insert(rows);
  if (error) {
    return { error: "Couldn't save. Make sure you've run supabase/meals.sql." };
  }

  revalidatePath("/app/meal");
  revalidatePath("/app");
  return { ok: true };
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

export async function saveFavorite(input: {
  name: string;
  items: FoodItem[];
}): Promise<{ ok?: boolean; error?: string }> {
  const supabase = await createClient();
  const user = await currentUser();
  if (!user) return { error: "Session expired." };

  const name = input.name?.trim().slice(0, 60);
  if (!name) return { error: "Give the favorite a name." };
  const items = cleanItems(input.items);
  if (items.length === 0) return { error: "Add at least one item first." };

  const { error } = await supabase
    .from("favorites")
    .insert({ user_id: user.id, name, items });
  if (error) {
    return {
      error: "Couldn't save. Make sure you've run supabase/meal-favorites.sql.",
    };
  }

  revalidatePath("/app/meal");
  return { ok: true };
}

export async function deleteFavorite(id: string): Promise<void> {
  const supabase = await createClient();
  const user = await currentUser();
  if (!user) return;
  if (!id) return;
  await supabase.from("favorites").delete().eq("id", id).eq("user_id", user.id);
  revalidatePath("/app/meal");
}

export async function updateGoal(
  goal: string,
): Promise<{ ok?: boolean; error?: string }> {
  const supabase = await createClient();
  const user = await currentUser();
  if (!user) return { error: "Session expired." };
  if (!GOALS.includes(goal as Goal)) return { error: "Pick a goal." };

  const { error } = await supabase
    .from("profiles")
    .update({ nutrition_goal: goal })
    .eq("id", user.id);

  if (error) {
    return {
      error: "Couldn't save. Make sure you've run supabase/nutrition-goal.sql.",
    };
  }
  revalidatePath("/app/meal");
  revalidatePath("/app");
  return { ok: true };
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
