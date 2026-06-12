// Server-only: derive the signed-in user's *this-month* season XP and active
// days from their logs (same "derive from data, no DB" engine as the report
// card / levels). Pairs with seasons.ts to build the Season HUD. The all-time
// streak rides along on Progress (progress-data.ts), so it isn't recomputed here.

import { createClient } from "@/lib/supabase/server";
import { currentUser } from "@/lib/auth";
import { serverToday } from "@/lib/server-today";
import { computeXp, type DailyActivity } from "@/lib/levels";
import { suggestTargets, effectiveTargets, type Targets } from "@/lib/nutrition";
import type { Gender } from "@/lib/onboarding";

export type SeasonCore = { seasonXp: number; activeDays: number };

/** Derive season XP + active-day count for the current calendar month. */
export async function getSeasonCore(): Promise<SeasonCore | null> {
  const user = await currentUser();
  if (!user) return null;
  const db = await createClient();
  const today = await serverToday();
  const monthStart = `${today.slice(0, 7)}-01`; // YYYY-MM-01

  const [wRes, mRes, jRes, suppRes, suppLogRes, gsRes, goalLogRes, pRes] = await Promise.all([
    db.from("workouts").select("performed_on").gte("performed_on", monthStart),
    db.from("meals").select("eaten_on, calories, protein").gte("eaten_on", monthStart),
    db.from("journal_entries").select("entry_date").gte("entry_date", monthStart),
    db.from("supplements").select("id"),
    db.from("supplement_logs").select("taken_on, supplement_id").gte("taken_on", monthStart),
    db.from("game_sessions").select("played_on").gte("played_on", monthStart),
    db.from("goal_logs").select("logged_on").gte("logged_on", monthStart),
    db
      .from("profiles")
      .select("dob, gender, height_cm, weight_kg, nutrition_targets")
      .eq("id", user.id)
      .maybeSingle(),
  ]);

  const workouts = (wRes.error ? [] : (wRes.data ?? [])) as { performed_on: string }[];
  const meals = (mRes.error ? [] : (mRes.data ?? [])) as { eaten_on: string; calories: number; protein: number }[];
  const journal = (jRes.error ? [] : (jRes.data ?? [])) as { entry_date: string }[];
  const suppCount = ((suppRes.error ? [] : (suppRes.data ?? [])) as unknown[]).length;
  const suppLogs = (suppLogRes.error ? [] : (suppLogRes.data ?? [])) as { taken_on: string }[];
  const sessions = (gsRes.error ? [] : (gsRes.data ?? [])) as { played_on: string }[];
  const goalLogs = (goalLogRes.error ? [] : (goalLogRes.data ?? [])) as { logged_on: string }[];

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

  const mealDays = new Map<string, { calories: number; protein: number }>();
  for (const m of meals) {
    const cur = mealDays.get(m.eaten_on) ?? { calories: 0, protein: 0 };
    cur.calories += m.calories || 0;
    cur.protein += m.protein || 0;
    mealDays.set(m.eaten_on, cur);
  }
  const suppDays = new Map<string, number>();
  for (const l of suppLogs) suppDays.set(l.taken_on, (suppDays.get(l.taken_on) ?? 0) + 1);

  const workoutDays = new Set(workouts.map((w) => w.performed_on));
  const journalDays = new Set(journal.map((j) => j.entry_date));
  const gamingDays = new Set(sessions.map((s) => s.played_on));
  const goalCheckinDays = new Set(goalLogs.map((g) => g.logged_on));

  // Season XP = this month's daily-activity XP. Goals-completed is excluded (no
  // reliable per-month completion date); daily goal check-ins still count.
  const activity: DailyActivity = {
    workoutDays,
    mealDays,
    journalDays,
    supplementDays: suppDays,
    gamingDays,
    goalCheckinDays,
    goalsCompleted: 0,
    supplementsInStack: suppCount,
  };
  const seasonXp = computeXp(activity, { calories: targets.calories, protein: targets.protein });

  const activeDays = new Set<string>([
    ...workoutDays,
    ...mealDays.keys(),
    ...journalDays,
    ...suppDays.keys(),
    ...gamingDays,
    ...goalCheckinDays,
  ]).size;

  return { seasonXp, activeDays };
}
