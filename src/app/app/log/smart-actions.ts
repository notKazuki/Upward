"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { currentUser } from "@/lib/auth";
import { serverToday } from "@/lib/server-today";
import { getProStatus } from "@/lib/pro-data";
import { GENERAL_DAYS } from "@/lib/workouts";
import { addJournalEntry } from "@/app/app/journal/actions";
import { matchByName, type SmartEntry, type Vocab } from "@/lib/smart-log";

export type SmartSaveResult = {
  ok?: boolean;
  error?: string;
  saved?: { meals: number; workouts: number; gaming: number; supplements: number; goals: number; notes: number };
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

  // Vocabulary for category validation + FK resolution (authoritative, server-side).
  const [profileRes, gamesRes, suppsRes, goalsRes] = await Promise.all([
    supabase.from("profiles").select("workout_days").eq("id", user.id).maybeSingle(),
    supabase.from("games").select("id, name, slug"),
    supabase.from("supplements").select("id, name"),
    supabase.from("goals").select("id, title, type").eq("status", "active"),
  ]);
  const allowed = new Set([...((profileRes.data?.workout_days as string[] | null) ?? []), ...GENERAL_DAYS]);
  const vocab: Vocab = {
    games: (gamesRes.data ?? []) as Vocab["games"],
    supplements: (suppsRes.data ?? []) as Vocab["supplements"],
    goals: (goalsRes.data ?? []) as Vocab["goals"],
  };
  const safeCategory = (c: string) => (allowed.has(c) ? c : "Cardio");
  const num = (v: number | null) => (typeof v === "number" && v >= 0 ? Math.round(v) : 0);

  const mealRows: Record<string, unknown>[] = [];
  const workoutRows: Record<string, unknown>[] = [];
  const gameRows: Record<string, unknown>[] = [];
  const goalRows: Record<string, unknown>[] = [];
  const suppIds: string[] = [];
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
    } else if (e.type === "gaming") {
      const g =
        matchByName(e.game, vocab.games, (x) => x.name) ??
        matchByName(e.game, vocab.games, (x) => x.slug ?? "");
      if (!g) continue;
      gameRows.push({
        user_id: user.id,
        game_id: g.id,
        played_on: today,
        matches: e.matches && e.matches > 0 ? num(e.matches) : 1,
        wins: num(e.wins),
        losses: num(e.losses),
        minutes: num(e.minutes),
        rank: null,
        notes: null,
      });
    } else if (e.type === "supplement") {
      const s = matchByName(e.supplement, vocab.supplements, (x) => x.name);
      if (s) suppIds.push(s.id);
    } else if (e.type === "goal") {
      const g = matchByName(e.goal, vocab.goals, (x) => x.title);
      if (!g) continue;
      const value = g.type === "numeric" ? (e.value ?? null) : g.type === "streak" ? 1 : null;
      goalRows.push({ user_id: user.id, goal_id: g.id, logged_on: today, value, note: null });
    } else if (e.type === "note") {
      notes.push(e.body);
    }
  }

  const saved = { meals: 0, workouts: 0, gaming: 0, supplements: 0, goals: 0, notes: 0 };

  if (mealRows.length) {
    const { error } = await supabase.from("meals").insert(mealRows);
    if (!error) saved.meals = mealRows.length;
  }
  if (workoutRows.length) {
    const { error } = await supabase.from("workouts").insert(workoutRows);
    if (!error) saved.workouts = workoutRows.length;
  }
  if (gameRows.length) {
    const { error } = await supabase.from("game_sessions").insert(gameRows);
    if (!error) saved.gaming = gameRows.length;
  }
  if (goalRows.length) {
    const { error } = await supabase.from("goal_logs").insert(goalRows);
    if (!error) saved.goals = goalRows.length;
  }
  if (suppIds.length) {
    // Skip supplements already checked off today, then insert the rest.
    const unique = [...new Set(suppIds)];
    const { data: existing } = await supabase
      .from("supplement_logs")
      .select("supplement_id")
      .eq("taken_on", today)
      .in("supplement_id", unique);
    const have = new Set(((existing ?? []) as { supplement_id: string }[]).map((r) => r.supplement_id));
    const rows = unique
      .filter((id) => !have.has(id))
      .map((id) => ({ user_id: user.id, supplement_id: id, taken_on: today }));
    if (rows.length) {
      const { error } = await supabase.from("supplement_logs").insert(rows);
      if (!error) saved.supplements = rows.length;
    }
  }
  if (notes.length) {
    const r = await addJournalEntry({ date: today, body: notes.join("\n\n").slice(0, 5000) });
    if (r.ok) saved.notes = notes.length;
  }

  revalidatePath("/app");
  revalidatePath("/app/meal");
  revalidatePath("/app/workout");
  revalidatePath("/app/gaming");
  revalidatePath("/app/supplement");
  revalidatePath("/app/goals");
  return { ok: true, saved };
}
