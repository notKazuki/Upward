"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { currentUser } from "@/lib/auth";

/** Everything the quick-add palette needs, in one round trip. `today` and
 * `yesterday` are the CLIENT's local dates (passed in, never computed here). */
export type QuickContext = {
  supplements: { id: string; name: string; timing: string; taken: boolean }[];
  workoutDays: string[];
  lastWorkout: { id: string; title: string; category: string; performed_on: string; exercises: number } | null;
  lastGame: { id: string; name: string } | null;
  yesterdayMealTypes: string[];
};

export async function getQuickContext(today: string, yesterday: string): Promise<QuickContext> {
  const me = await currentUser();
  const empty: QuickContext = {
    supplements: [],
    workoutDays: [],
    lastWorkout: null,
    lastGame: null,
    yesterdayMealTypes: [],
  };
  if (!me || !today) return empty;
  const supabase = await createClient();

  const [suppRes, logRes, profRes, wRes, gRes, mRes] = await Promise.all([
    supabase.from("supplements").select("id, name, timing").order("created_at", { ascending: true }),
    supabase.from("supplement_logs").select("supplement_id").eq("taken_on", today),
    supabase.from("profiles").select("workout_days").eq("id", me.id).maybeSingle(),
    supabase
      .from("workouts")
      .select("id, title, category, performed_on")
      .order("performed_on", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(1),
    supabase
      .from("game_sessions")
      .select("game_id, played_on")
      .order("played_on", { ascending: false })
      .limit(1),
    supabase.from("meals").select("meal_type").eq("eaten_on", yesterday),
  ]);

  const taken = new Set(
    ((logRes.data ?? []) as { supplement_id: string }[]).map((l) => l.supplement_id),
  );
  const supplements = ((suppRes.data ?? []) as { id: string; name: string; timing: string }[]).map(
    (s) => ({ ...s, taken: taken.has(s.id) }),
  );

  // Last workout + how many distinct exercises it had (for the repeat label).
  let lastWorkout: QuickContext["lastWorkout"] = null;
  const w = ((wRes.data ?? []) as { id: string; title: string; category: string; performed_on: string }[])[0];
  if (w) {
    const { data: sets } = await supabase
      .from("workout_sets")
      .select("exercise")
      .eq("workout_id", w.id);
    const exercises = new Set(((sets ?? []) as { exercise: string }[]).map((s) => s.exercise)).size;
    lastWorkout = { ...w, exercises };
  }

  // Last-played game.
  let lastGame: QuickContext["lastGame"] = null;
  const lastSession = ((gRes.data ?? []) as { game_id: string }[])[0];
  if (lastSession) {
    const { data: game } = await supabase
      .from("games")
      .select("id, name")
      .eq("id", lastSession.game_id)
      .maybeSingle();
    if (game) lastGame = game as { id: string; name: string };
  }

  return {
    supplements,
    workoutDays: (profRes.data?.workout_days as string[] | null) ?? [],
    lastWorkout,
    lastGame,
    yesterdayMealTypes: [
      ...new Set(((mRes.data ?? []) as { meal_type: string }[]).map((m) => m.meal_type)),
    ],
  };
}

/** Re-log the most recent workout for today — same title, day, and sets. */
export async function repeatLastWorkout(today: string): Promise<{ ok?: boolean; error?: string; title?: string }> {
  const me = await currentUser();
  if (!me || !today) return { error: "Session expired." };
  const supabase = await createClient();

  const { data: last } = await supabase
    .from("workouts")
    .select("id, title, category, duration_min")
    .order("performed_on", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!last) return { error: "No workout to repeat yet." };

  const { data: created, error } = await supabase
    .from("workouts")
    .insert({
      user_id: me.id,
      title: last.title,
      category: last.category,
      performed_on: today,
      duration_min: last.duration_min,
      notes: null,
    })
    .select("id")
    .single();
  if (error || !created) return { error: "Couldn't repeat the workout." };

  const { data: sets } = await supabase
    .from("workout_sets")
    .select("exercise, set_index, weight, reps")
    .eq("workout_id", last.id)
    .order("set_index", { ascending: true });
  if (sets && sets.length > 0) {
    await supabase.from("workout_sets").insert(
      (sets as { exercise: string; set_index: number; weight: number | null; reps: number | null }[]).map(
        (s) => ({ ...s, user_id: me.id, workout_id: created.id }),
      ),
    );
  }

  revalidatePath("/app/workout");
  revalidatePath("/app");
  return { ok: true, title: last.title as string };
}

/** One-tap match result for the last-played game. */
export async function quickMatch(
  gameId: string,
  won: boolean,
  today: string,
): Promise<{ ok?: boolean; error?: string }> {
  const me = await currentUser();
  if (!me || !gameId || !today) return { error: "Session expired." };
  const supabase = await createClient();
  const { error } = await supabase.from("game_sessions").insert({
    user_id: me.id,
    game_id: gameId,
    played_on: today,
    matches: 1,
    wins: won ? 1 : 0,
    losses: won ? 0 : 1,
    minutes: 0,
    rank: null,
    notes: null,
  });
  if (error) return { error: "Couldn't log the match." };
  revalidatePath("/app/gaming");
  revalidatePath("/app");
  return { ok: true };
}

/** Copy yesterday's meals of one type to today ("same breakfast as yesterday"). */
export async function copyYesterdayMeals(
  mealType: string,
  today: string,
  yesterday: string,
): Promise<{ ok?: boolean; error?: string; copied?: number }> {
  const me = await currentUser();
  if (!me || !today || !yesterday) return { error: "Session expired." };
  const supabase = await createClient();

  const { data: rows } = await supabase
    .from("meals")
    .select("meal_type, name, calories, protein, carbs, fat")
    .eq("eaten_on", yesterday)
    .eq("meal_type", mealType)
    .limit(30);
  const items = (rows ?? []) as {
    meal_type: string;
    name: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  }[];
  if (items.length === 0) return { error: "Nothing logged yesterday for that meal." };

  const { error } = await supabase
    .from("meals")
    .insert(items.map((i) => ({ ...i, user_id: me.id, eaten_on: today })));
  if (error) return { error: "Couldn't copy the meal." };
  revalidatePath("/app/meal");
  revalidatePath("/app");
  return { ok: true, copied: items.length };
}
