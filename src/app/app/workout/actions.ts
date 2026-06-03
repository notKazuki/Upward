"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { GENERAL_DAYS } from "@/lib/workouts";

export type WorkoutActionState = { ok?: boolean; error?: string; ts?: number };

export async function addWorkout(
  _prev: WorkoutActionState,
  formData: FormData,
): Promise<WorkoutActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Your session expired. Please sign in again." };

  const title = String(formData.get("title") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim();
  const performed_on = String(formData.get("performed_on") ?? "");
  const durationRaw = String(formData.get("duration_min") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();

  if (!title) return { error: "Give your workout a title." };
  if (!category) return { error: "Pick a day." };
  if (!performed_on) return { error: "Pick a date." };

  // Validate the day against the user's split (+ general tags) when available.
  const { data: profile } = await supabase
    .from("profiles")
    .select("workout_days")
    .eq("id", user.id)
    .maybeSingle();
  const allowed = [...(profile?.workout_days ?? []), ...GENERAL_DAYS];
  if (allowed.length > 0 && !allowed.includes(category)) {
    return { error: "That day isn't part of your split." };
  }

  const duration_min = durationRaw ? Number(durationRaw) : null;
  if (
    duration_min !== null &&
    (!Number.isFinite(duration_min) || duration_min < 0)
  ) {
    return { error: "Duration must be a positive number." };
  }

  const { error } = await supabase.from("workouts").insert({
    user_id: user.id,
    title,
    category,
    performed_on,
    duration_min,
    notes: notes || null,
  });

  if (error) {
    return {
      error:
        "Couldn't save. Make sure the workouts table exists (see supabase/workouts.sql).",
    };
  }

  revalidatePath("/app/workout");
  revalidatePath("/app");
  return { ok: true, ts: Date.now() };
}

export async function deleteWorkout(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await supabase.from("workouts").delete().eq("id", id).eq("user_id", user.id);
  revalidatePath("/app/workout");
  revalidatePath("/app");
}

const GOALS = ["strength", "hypertrophy", "endurance"];

export async function updateTrainingGoal(
  goal: string,
): Promise<{ ok?: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Session expired." };
  // Empty string clears the goal.
  const value = GOALS.includes(goal) ? goal : null;

  const { error } = await supabase
    .from("profiles")
    .update({ training_goal: value })
    .eq("id", user.id);
  if (error) {
    return { error: "Couldn't save. Make sure you've run supabase/workout-goal-custom.sql." };
  }
  revalidatePath("/app/workout");
  return { ok: true };
}

export async function addCustomExercise(input: {
  day: string;
  name: string;
  target?: string;
  sets?: string;
  reps?: string;
}): Promise<{ ok?: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Session expired." };

  const day = input.day?.trim();
  const name = input.name?.trim().slice(0, 80);
  if (!day) return { error: "Missing day." };
  if (!name) return { error: "Name your exercise." };

  const clean = (v: string | undefined, max: number) => {
    const s = (v ?? "").trim().slice(0, max);
    return s || null;
  };

  const { error } = await supabase.from("custom_exercises").insert({
    user_id: user.id,
    day_label: day,
    name,
    target: clean(input.target, 60),
    sets: clean(input.sets, 12),
    reps: clean(input.reps, 16),
  });
  if (error) {
    return { error: "Couldn't save. Make sure you've run supabase/workout-goal-custom.sql." };
  }
  revalidatePath("/app/workout");
  return { ok: true };
}

export async function deleteCustomExercise(id: string): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !id) return;
  await supabase.from("custom_exercises").delete().eq("id", id).eq("user_id", user.id);
  revalidatePath("/app/workout");
}

export async function saveWorkoutSplit(input: {
  splitId: string;
  name: string;
  days: string[];
}): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Your session expired. Please sign in again." };

  const days = (input.days ?? [])
    .map((d) => d.trim())
    .filter(Boolean)
    .slice(0, 12);
  if (days.length === 0) return { error: "Add at least one day." };
  if (!input.splitId) return { error: "Choose a split." };

  const name = input.name?.trim() || "Workout";

  const { error } = await supabase
    .from("profiles")
    .update({
      workout_split: input.splitId,
      workout_split_name: name,
      workout_days: days,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (error) {
    return {
      error:
        "Couldn't save your split. Make sure to run supabase/workout-splits.sql.",
    };
  }

  revalidatePath("/app/workout");
  redirect("/app/workout");
}
