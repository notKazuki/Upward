// Server-only: assembles the coach's grounding context from the user's real,
// cross-domain data — the 30-day report card, today's focus, and streak. Shared
// by the Coach page (deterministic brief) and the chat API (LLM grounding), so
// the Sherpa always speaks from the same picture. No RPG, no character math.

import { createClient } from "@/lib/supabase/server";
import { currentUser } from "@/lib/auth";
import { serverToday } from "@/lib/server-today";
import { buildReport, type Report } from "@/lib/report";
import { buildFocus, type FocusBoard, type FocusKey, type FocusSignal } from "@/lib/focus";
import { aggregate, type GameRow, type SessionRow, type WorkoutRow } from "@/lib/dashboard";
import { effectiveTargets, suggestTargets, type Targets } from "@/lib/nutrition";
import type { Goal, GoalLog } from "@/lib/goals";
import type { Gender } from "@/lib/onboarding";

export type CoachContext = {
  name: string;
  hasData: boolean;
  report: Report;
  focus: FocusBoard;
  streak: number;
};

function isoDaysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

export async function getCoachContext(): Promise<CoachContext | null> {
  const user = await currentUser();
  if (!user) return null;
  const supabase = await createClient();
  const since = isoDaysAgo(56);
  const today = await serverToday();

  const [wRes, sRes, gRes, pRes, mRes, goalsRes, goalLogsRes, suppRes, suppLogRes, jRes, idRes] =
    await Promise.all([
      supabase.from("workouts").select("performed_on, category, duration_min").gte("performed_on", since),
      supabase
        .from("game_sessions")
        .select("game_id, played_on, matches, wins, losses, minutes")
        .gte("played_on", since),
      supabase.from("games").select("id, name, goals"),
      supabase
        .from("profiles")
        .select("workout_days, dob, gender, height_cm, weight_kg, nutrition_targets")
        .eq("id", user.id)
        .maybeSingle(),
      supabase.from("meals").select("eaten_on, calories, protein").gte("eaten_on", since),
      supabase.from("goals").select("*").eq("status", "active").order("created_at", { ascending: true }),
      supabase.from("goal_logs").select("*"),
      supabase.from("supplements").select("id"),
      supabase.from("supplement_logs").select("supplement_id, taken_on").gte("taken_on", since),
      supabase.from("journal_entries").select("entry_date, mood").gte("entry_date", since),
      supabase.from("profiles").select("display_name, username").eq("id", user.id).maybeSingle(),
    ]);

  const workouts = (wRes.error ? [] : (wRes.data ?? [])) as WorkoutRow[];
  const sessions = (sRes.error ? [] : (sRes.data ?? [])) as SessionRow[];
  const games = (gRes.error ? [] : (gRes.data ?? [])) as GameRow[];
  const profile = (pRes.error ? null : pRes.data) as {
    workout_days?: string[] | null;
    dob?: string | null;
    gender?: string | null;
    height_cm?: number | null;
    weight_kg?: number | null;
    nutrition_targets?: Targets | null;
  } | null;
  const workoutDays = profile?.workout_days ?? [];

  const mealsAll = (mRes.error ? [] : (mRes.data ?? [])) as {
    eaten_on: string;
    calories: number;
    protein: number;
  }[];
  const mealsToday = mealsAll.filter((m) => m.eaten_on === today);
  const caloriesToday = mealsToday.reduce((s, m) => s + (m.calories || 0), 0);
  const proteinToday = mealsToday.reduce((s, m) => s + (m.protein || 0), 0);
  const journal = (jRes.error ? [] : (jRes.data ?? [])) as {
    entry_date: string;
    mood: string | null;
  }[];

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

  const suppIds = new Set(
    (suppRes.error ? [] : (suppRes.data ?? [])).map((s: { id: string }) => s.id),
  );
  const suppTotal = suppIds.size;
  const suppLogsAll = (suppLogRes.error ? [] : (suppLogRes.data ?? [])) as {
    supplement_id: string;
    taken_on: string;
  }[];
  const suppTaken = suppLogsAll.filter(
    (l) => l.taken_on === today && suppIds.has(l.supplement_id),
  ).length;

  const activeGoals = (goalsRes.error ? [] : (goalsRes.data ?? [])) as Goal[];
  const allGoalLogs = (goalLogsRes.error ? [] : (goalLogsRes.data ?? [])) as GoalLog[];

  const extraActiveDates = [
    ...mealsAll.map((m) => m.eaten_on),
    ...journal.map((j) => j.entry_date),
    ...suppLogsAll.map((l) => l.taken_on),
    ...allGoalLogs.map((l) => l.logged_on),
  ];

  const a = aggregate(
    workouts,
    sessions,
    games,
    workoutDays,
    {
      hasMeals: mealsToday.length > 0,
      caloriesToday,
      proteinToday,
      calTarget: targets.calories,
      proteinTarget: targets.protein,
    },
    today,
    extraActiveDates,
  );

  const report = buildReport({
    todayStr: today,
    days: 30,
    workouts,
    sessions,
    meals: mealsAll,
    calTarget: targets.calories,
    proteinTarget: targets.protein,
    journal,
    supplementsCount: suppTotal,
    supplementLogs: suppLogsAll,
    goals: activeGoals,
    goalLogs: allGoalLogs,
  });

  const weekStart = isoDaysAgo(6);
  const days7 = (dates: string[]) =>
    new Set(dates.filter((d) => d >= weekStart && d <= today)).size;
  const focusSignals: Record<FocusKey, FocusSignal> = {
    workout: {
      active: true,
      done: workouts.some((w) => w.performed_on === today),
      engagement: days7(workouts.map((w) => w.performed_on)),
    },
    meal: {
      active: true,
      done: mealsToday.length > 0,
      engagement: days7(mealsAll.map((m) => m.eaten_on)),
    },
    protein: {
      active: Boolean(targets.protein),
      done: Boolean(targets.protein) && proteinToday >= (targets.protein ?? 0) * 0.9,
      engagement: 0,
    },
    supps: {
      active: suppTotal > 0,
      done: suppTotal > 0 && suppTaken >= suppTotal,
      engagement: days7(suppLogsAll.map((l) => l.taken_on)),
    },
    gaming: {
      active: games.length > 0,
      done: sessions.some((s) => s.played_on === today),
      engagement: days7(sessions.map((s) => s.played_on)),
    },
    journal: {
      active: true,
      done: journal.some((j) => j.entry_date === today),
      engagement: days7(journal.map((j) => j.entry_date)),
    },
    goals: {
      active: activeGoals.length > 0,
      done: allGoalLogs.some((l) => l.logged_on === today),
      engagement: days7(allGoalLogs.map((l) => l.logged_on)),
    },
  };
  const focus = buildFocus(focusSignals);

  const name =
    ((idRes.error ? null : idRes.data?.display_name) as string | null)?.trim() ||
    ((idRes.error ? null : idRes.data?.username) as string | null)?.trim() ||
    "";

  return {
    name,
    hasData: report.overall !== null,
    report,
    focus,
    streak: a.streakDays,
  };
}
