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

type SessionEntry = {
  exercise: string;
  sets: { weight: number | null; reps: number | null }[];
};
type SetRow = {
  exercise: string;
  set_index: number;
  weight: number | null;
  reps: number | null;
};

/** Flatten exercise entries → clean, 1-indexed set rows (drops empty sets). */
function collectSetRows(entries: SessionEntry[] = []): SetRow[] {
  const rows: SetRow[] = [];
  for (const e of entries) {
    const name = (e.exercise ?? "").trim().slice(0, 80);
    if (!name) continue;
    let idx = 0;
    for (const s of e.sets ?? []) {
      const weight =
        typeof s.weight === "number" && Number.isFinite(s.weight) && s.weight >= 0
          ? s.weight
          : null;
      const reps =
        typeof s.reps === "number" && Number.isFinite(s.reps) && s.reps >= 0
          ? Math.round(s.reps)
          : null;
      if (weight == null && reps == null) continue;
      idx++;
      rows.push({ exercise: name, set_index: idx, weight, reps });
    }
  }
  return rows;
}

export async function logSession(input: {
  day: string;
  date: string;
  title?: string;
  durationMin?: number | null;
  notes?: string;
  entries: SessionEntry[];
}): Promise<{ ok?: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Your session expired. Please sign in again." };

  const day = (input.day ?? "").trim();
  if (!day) return { error: "Pick a day." };
  if (!input.date) return { error: "Pick a date." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("workout_days")
    .eq("id", user.id)
    .maybeSingle();
  const allowed = [...(profile?.workout_days ?? []), ...GENERAL_DAYS];
  if (allowed.length > 0 && !allowed.includes(day)) {
    return { error: "That day isn't part of your split." };
  }

  const setRows = collectSetRows(input.entries);

  const notes = (input.notes ?? "").trim().slice(0, 500) || null;
  const explicitTitle = (input.title ?? "").trim().slice(0, 120);
  const duration_min =
    typeof input.durationMin === "number" && input.durationMin >= 0
      ? Math.round(input.durationMin)
      : null;

  if (setRows.length === 0 && !notes && !explicitTitle && duration_min === null) {
    return { error: "Log at least one set, or add a note." };
  }

  const { data: w, error: wErr } = await supabase
    .from("workouts")
    .insert({
      user_id: user.id,
      title: explicitTitle || day,
      category: day,
      performed_on: input.date,
      duration_min,
      notes,
    })
    .select("id")
    .single();
  if (wErr || !w) {
    return { error: "Couldn't save. Make sure you've run supabase/workouts.sql." };
  }

  if (setRows.length > 0) {
    const { error: sErr } = await supabase
      .from("workout_sets")
      .insert(setRows.map((r) => ({ ...r, user_id: user.id, workout_id: w.id })));
    if (sErr) {
      return { error: "Session saved — but run supabase/workout-sets.sql to record sets." };
    }
  }

  revalidatePath("/app/workout");
  revalidatePath("/app");
  return { ok: true };
}

export async function updateSession(input: {
  workoutId: string;
  day: string;
  date: string;
  title?: string;
  durationMin?: number | null;
  notes?: string;
  entries: SessionEntry[];
}): Promise<{ ok?: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Your session expired. Please sign in again." };

  const id = input.workoutId?.trim();
  if (!id) return { error: "Missing workout." };
  const day = (input.day ?? "").trim();
  if (!day) return { error: "Pick a day." };
  if (!input.date) return { error: "Pick a date." };

  // Ownership check.
  const { data: existing } = await supabase
    .from("workouts")
    .select("id")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!existing) return { error: "Workout not found." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("workout_days")
    .eq("id", user.id)
    .maybeSingle();
  const allowed = [...(profile?.workout_days ?? []), ...GENERAL_DAYS];
  if (allowed.length > 0 && !allowed.includes(day)) {
    return { error: "That day isn't part of your split." };
  }

  const setRows = collectSetRows(input.entries);
  const notes = (input.notes ?? "").trim().slice(0, 500) || null;
  const explicitTitle = (input.title ?? "").trim().slice(0, 120);
  const duration_min =
    typeof input.durationMin === "number" && input.durationMin >= 0
      ? Math.round(input.durationMin)
      : null;

  if (setRows.length === 0 && !notes && !explicitTitle && duration_min === null) {
    return { error: "Keep at least one set, a title, or a note." };
  }

  const { error: wErr } = await supabase
    .from("workouts")
    .update({
      title: explicitTitle || day,
      category: day,
      performed_on: input.date,
      duration_min,
      notes,
    })
    .eq("id", id)
    .eq("user_id", user.id);
  if (wErr) return { error: "Couldn't save your changes." };

  // Replace the session's sets wholesale (simplest correct approach).
  await supabase
    .from("workout_sets")
    .delete()
    .eq("workout_id", id)
    .eq("user_id", user.id);
  if (setRows.length > 0) {
    const { error: sErr } = await supabase
      .from("workout_sets")
      .insert(setRows.map((r) => ({ ...r, user_id: user.id, workout_id: id })));
    if (sErr) {
      return { error: "Saved — but run supabase/workout-sets.sql to record sets." };
    }
  }

  revalidatePath("/app/workout");
  revalidatePath("/app");
  return { ok: true };
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

export async function updateCustomExercise(
  id: string,
  patch: { name?: string; target?: string; sets?: string; reps?: string },
): Promise<{ ok?: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Session expired." };
  if (!id) return { error: "Missing exercise." };

  const fields: Record<string, unknown> = {};
  if (patch.name !== undefined) {
    const n = patch.name.trim().slice(0, 80);
    if (!n) return { error: "Name can't be empty." };
    fields.name = n;
  }
  const clean = (v: string | undefined, max: number) => {
    const s = (v ?? "").trim().slice(0, max);
    return s || null;
  };
  if (patch.target !== undefined) fields.target = clean(patch.target, 60);
  if (patch.sets !== undefined) fields.sets = clean(patch.sets, 12);
  if (patch.reps !== undefined) fields.reps = clean(patch.reps, 16);

  const { error } = await supabase
    .from("custom_exercises")
    .update(fields)
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) return { error: "Couldn't save changes." };
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
