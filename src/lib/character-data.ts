// Server-only: fetch a user's tracked data, build the report card, and derive
// the RPG character (attributes + class). Self uses the session client; viewing
// another user (public card) uses the service-role admin client. Never import
// into a Client Component.

import { createClient } from "@/lib/supabase/server";
import { createAdminClient, isAdminConfigured } from "@/lib/supabase/admin";
import { currentUser } from "@/lib/auth";
import { serverToday } from "@/lib/server-today";
import type { SessionRow, WorkoutRow } from "@/lib/dashboard";
import { periodStats, windowStart, type MealRow } from "@/lib/insights";
import { buildReport } from "@/lib/report";
import { buildCharacter, type Character } from "@/lib/character";
import type { Goal, GoalLog } from "@/lib/goals";
import { effectiveTargets, suggestTargets, type Targets } from "@/lib/nutrition";
import type { Gender } from "@/lib/onboarding";

type Db = Awaited<ReturnType<typeof createClient>> | ReturnType<typeof createAdminClient>;

const WINDOW = 30; // days — the character reflects your last month

/** Derive a user's character from their data. Every query is scoped by user_id
 * so it's correct whether `db` is RLS-scoped (session) or RLS-bypassing (admin). */
async function loadCharacter(db: Db, userId: string): Promise<Character> {
  const today = await serverToday();
  const since = windowStart(today, WINDOW);

  const [wRes, sRes, mRes, jRes, suppRes, suppLogRes, goalsRes, goalLogsRes, pRes] =
    await Promise.all([
      db.from("workouts").select("performed_on, category, duration_min").eq("user_id", userId).gte("performed_on", since),
      db.from("game_sessions").select("played_on, matches, wins, losses, minutes").eq("user_id", userId).gte("played_on", since),
      db.from("meals").select("eaten_on, calories, protein").eq("user_id", userId).gte("eaten_on", since),
      db.from("journal_entries").select("entry_date, mood").eq("user_id", userId).gte("entry_date", since),
      db.from("supplements").select("id").eq("user_id", userId),
      db.from("supplement_logs").select("supplement_id, taken_on").eq("user_id", userId).gte("taken_on", since),
      db.from("goals").select("*").eq("user_id", userId).eq("status", "active"),
      db.from("goal_logs").select("*").eq("user_id", userId),
      db.from("profiles").select("dob, gender, height_cm, weight_kg, nutrition_targets").eq("id", userId).maybeSingle(),
    ]);

  const workouts = (wRes.error ? [] : (wRes.data ?? [])) as WorkoutRow[];
  const sessions = (sRes.error ? [] : (sRes.data ?? [])) as SessionRow[];
  const meals = (mRes.error ? [] : (mRes.data ?? [])) as MealRow[];
  const journal = (jRes.error ? [] : (jRes.data ?? [])) as { entry_date: string; mood: string | null }[];
  const supplementsCount = (suppRes.error ? [] : (suppRes.data ?? [])).length;
  const supplementLogs = (suppLogRes.error ? [] : (suppLogRes.data ?? [])) as { taken_on: string; supplement_id: string }[];
  const goals = (goalsRes.error ? [] : (goalsRes.data ?? [])) as Goal[];
  const goalLogs = (goalLogsRes.error ? [] : (goalLogsRes.data ?? [])) as GoalLog[];

  const profile = (pRes.error ? null : pRes.data) as {
    dob?: string | null;
    gender?: string | null;
    height_cm?: number | null;
    weight_kg?: number | null;
    nutrition_targets?: Targets | null;
  } | null;
  const suggested = suggestTargets({
    dob: profile?.dob ?? null,
    gender: (profile?.gender as Gender | null) ?? null,
    height_cm: profile?.height_cm ?? null,
    weight_kg: profile?.weight_kg ?? null,
  });
  const savedRaw = profile?.nutrition_targets ?? null;
  const targets = effectiveTargets(savedRaw && Object.keys(savedRaw).length > 0 ? savedRaw : null, suggested);

  const stats = periodStats(workouts, sessions, meals, since, today, WINDOW);
  const report = buildReport({
    todayStr: today,
    days: WINDOW,
    workouts,
    sessions,
    meals,
    calTarget: targets.calories,
    proteinTarget: targets.protein,
    journal,
    supplementsCount,
    supplementLogs,
    goals,
    goalLogs,
  });

  return buildCharacter(report, stats.consistencyPct);
}

/** The signed-in user's character. */
export async function getCharacter(): Promise<Character | null> {
  const user = await currentUser();
  if (!user) return null;
  const db = await createClient();
  return loadCharacter(db, user.id);
}

/** Another user's character (for the public card), via the service-role client. */
export async function getCharacterFor(userId: string): Promise<Character | null> {
  if (!isAdminConfigured) return null;
  const db = createAdminClient();
  return loadCharacter(db, userId);
}
