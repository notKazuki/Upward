// Server-only: fetch the user's tracked data, build the report card, and derive
// the RPG character (attributes + class). Mirrors the Insights page's fetch but
// returns the character sheet. Never import into a Client Component.

import { createClient } from "@/lib/supabase/server";
import { currentUser } from "@/lib/auth";
import { serverToday } from "@/lib/server-today";
import type { SessionRow, WorkoutRow } from "@/lib/dashboard";
import { periodStats, windowStart, type MealRow } from "@/lib/insights";
import { buildReport } from "@/lib/report";
import { buildCharacter, type Character } from "@/lib/character";
import type { Goal, GoalLog } from "@/lib/goals";
import { effectiveTargets, suggestTargets, type Targets } from "@/lib/nutrition";
import type { Gender } from "@/lib/onboarding";

const WINDOW = 30; // days — the character reflects your last month

export async function getCharacter(): Promise<Character | null> {
  const supabase = await createClient();
  const user = await currentUser();
  if (!user) return null;

  const today = await serverToday();
  const since = windowStart(today, WINDOW);

  const [wRes, sRes, mRes, jRes, suppRes, suppLogRes, goalsRes, goalLogsRes, pRes] =
    await Promise.all([
      supabase.from("workouts").select("performed_on, category, duration_min").gte("performed_on", since),
      supabase.from("game_sessions").select("played_on, matches, wins, losses, minutes").gte("played_on", since),
      supabase.from("meals").select("eaten_on, calories, protein").gte("eaten_on", since),
      supabase.from("journal_entries").select("entry_date, mood").gte("entry_date", since),
      supabase.from("supplements").select("id"),
      supabase.from("supplement_logs").select("supplement_id, taken_on").gte("taken_on", since),
      supabase.from("goals").select("*").eq("status", "active"),
      supabase.from("goal_logs").select("*"),
      supabase
        .from("profiles")
        .select("dob, gender, height_cm, weight_kg, nutrition_targets")
        .eq("id", user.id)
        .maybeSingle(),
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
  const targets = effectiveTargets(
    savedRaw && Object.keys(savedRaw).length > 0 ? savedRaw : null,
    suggested,
  );

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
