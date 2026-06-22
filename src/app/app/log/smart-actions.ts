"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { currentUser } from "@/lib/auth";
import { serverToday } from "@/lib/server-today";
import { getProStatus } from "@/lib/pro-data";
import { GENERAL_DAYS } from "@/lib/workouts";
import { addJournalEntry } from "@/app/app/journal/actions";
import type { SmartEntry } from "@/lib/smart-log";

export type SmartSaveResult = {
  ok?: boolean;
  error?: string;
  saved?: { meals: number; workouts: number; notes: number };
};

/** Persist the entries the user kept from the Smart Log review, to today. */
export async function saveSmartLog(entries: SmartEntry[]): Promise<SmartSaveResult> {
  const user = await currentUser();
  if (!user) return { error: "Session expired." };
  const { pro } = await getProStatus();
  if (!pro) return { error: "Smart Log is a Pro feature." };
  if (!Array.isArray(entries) || entries.length === 0) return { error: "Nothing selected." };

  const supabase = await createClient();
  const today = await serverToday();

  // Valid workout categories for this user (so a stray category can't break it).
  const { data: profile } = await supabase
    .from("profiles")
    .select("workout_days")
    .eq("id", user.id)
    .maybeSingle();
  const allowed = new Set([...((profile?.workout_days as string[] | null) ?? []), ...GENERAL_DAYS]);
  const safeCategory = (c: string) => (allowed.has(c) ? c : "Cardio");
  const num = (v: number | null) => (typeof v === "number" && v >= 0 ? Math.round(v) : 0);

  const mealRows: Record<string, unknown>[] = [];
  const workoutRows: Record<string, unknown>[] = [];
  const notes: string[] = [];

  for (const e of entries.slice(0, 30)) {
    if (e.type === "meal") {
      mealRows.push({
        user_id: user.id,
        meal_type: e.mealType,
        eaten_on: today,
        name: e.name.slice(0, 80),
        calories: num(e.calories),
        protein: num(e.protein),
        carbs: num(e.carbs),
        fat: num(e.fat),
      });
    } else if (e.type === "workout") {
      workoutRows.push({
        user_id: user.id,
        title: e.title.slice(0, 120),
        category: safeCategory(e.category),
        performed_on: today,
        duration_min: e.durationMin && e.durationMin > 0 ? Math.round(e.durationMin) : null,
        notes: e.notes ? e.notes.slice(0, 500) : null,
      });
    } else if (e.type === "note") {
      notes.push(e.body);
    }
  }

  let meals = 0;
  let workouts = 0;
  let noteCount = 0;

  if (mealRows.length) {
    const { error } = await supabase.from("meals").insert(mealRows);
    if (!error) meals = mealRows.length;
  }
  if (workoutRows.length) {
    const { error } = await supabase.from("workouts").insert(workoutRows);
    if (!error) workouts = workoutRows.length;
  }
  if (notes.length) {
    const r = await addJournalEntry({ date: today, body: notes.join("\n\n").slice(0, 5000) });
    if (r.ok) noteCount = notes.length;
  }

  revalidatePath("/app");
  revalidatePath("/app/meal");
  revalidatePath("/app/workout");
  return { ok: true, saved: { meals, workouts, notes: noteCount } };
}
