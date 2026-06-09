// Server-only: compute a user's XP / level / rank and earned achievements from
// their logged activity (derived, like the report card), and persist earned
// badges. Self uses the session client; viewing others uses the service-role
// client. Never import into a Client Component.

import { createClient } from "@/lib/supabase/server";
import { createAdminClient, isAdminConfigured } from "@/lib/supabase/admin";
import { currentUser } from "@/lib/auth";
import {
  computeXp,
  levelForXp,
  rankForLevel,
  nextRank,
  type DailyActivity,
  type LevelInfo,
  type Rank,
} from "@/lib/levels";
import {
  earnedIds,
  achievementXp,
  type AchievementStats,
} from "@/lib/achievements";
import { suggestTargets, effectiveTargets, type Targets } from "@/lib/nutrition";
import type { Gender } from "@/lib/onboarding";

type Db = Awaited<ReturnType<typeof createClient>> | ReturnType<typeof createAdminClient>;

export type Progress = {
  xp: number;
  level: LevelInfo;
  rank: Rank;
  next: Rank | null;
  stats: AchievementStats;
  earned: { id: string; earned_on: string }[];
};

function longestStreak(days: Set<string>): number {
  if (days.size === 0) return 0;
  const sorted = [...days].sort();
  let best = 1;
  let run = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(`${sorted[i - 1]}T00:00:00`);
    const cur = new Date(`${sorted[i]}T00:00:00`);
    const diff = Math.round((cur.getTime() - prev.getTime()) / 86_400_000);
    if (diff === 1) run++;
    else run = 1;
    if (run > best) best = run;
  }
  return best;
}

/** Gather everything, compute XP → level → rank, and resolve earned ids. */
async function loadProgress(db: Db, userId: string): Promise<Progress> {
  const [wRes, mRes, jRes, suppRes, suppLogRes, gsRes, goalsRes, goalLogRes, frRes, pRes] =
    await Promise.all([
      db.from("workouts").select("performed_on").eq("user_id", userId),
      db.from("meals").select("eaten_on, calories, protein").eq("user_id", userId),
      db.from("journal_entries").select("entry_date").eq("user_id", userId),
      db.from("supplements").select("id").eq("user_id", userId),
      db.from("supplement_logs").select("taken_on, supplement_id").eq("user_id", userId),
      db.from("game_sessions").select("played_on, matches, wins, losses").eq("user_id", userId),
      db.from("goals").select("status").eq("user_id", userId),
      db.from("goal_logs").select("logged_on").eq("user_id", userId),
      db.from("friendships").select("status").eq("status", "accepted").or(`requester_id.eq.${userId},addressee_id.eq.${userId}`),
      db.from("profiles").select("dob, gender, height_cm, weight_kg, nutrition_targets").eq("id", userId).maybeSingle(),
    ]);

  const workouts = (wRes.data ?? []) as { performed_on: string }[];
  const meals = (mRes.data ?? []) as { eaten_on: string; calories: number; protein: number }[];
  const journal = (jRes.data ?? []) as { entry_date: string }[];
  const suppCount = ((suppRes.data ?? []) as unknown[]).length;
  const suppLogs = (suppLogRes.data ?? []) as { taken_on: string; supplement_id: string }[];
  const sessions = (gsRes.data ?? []) as { played_on: string; matches: number; wins: number; losses: number }[];
  const goals = (goalsRes.data ?? []) as { status: string }[];
  const goalLogs = (goalLogRes.data ?? []) as { logged_on: string }[];
  const friends = ((frRes.data ?? []) as unknown[]).length;

  // targets
  const profile = (pRes.data ?? null) as {
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
  const saved = profile?.nutrition_targets ?? null;
  const targets = effectiveTargets(saved && Object.keys(saved).length > 0 ? saved : null, suggested);

  // daily activity
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
  const gamingDays = new Set(sessions.map((s) => s.played_on));
  const activity: DailyActivity = {
    workoutDays,
    mealDays,
    journalDays: new Set(journal.map((j) => j.entry_date)),
    supplementDays: suppDays,
    gamingDays,
    goalCheckinDays: new Set(goalLogs.map((g) => g.logged_on)),
    goalsCompleted: goals.filter((g) => g.status === "completed").length,
    supplementsInStack: suppCount,
  };

  // achievement counters
  const proteinHitDays = targets.protein
    ? [...mealDays.values()].filter((v) => v.protein >= targets.protein! * 0.9).length
    : 0;
  const supplementPerfectDays = suppCount
    ? [...suppDays.values()].filter((t) => t >= suppCount).length
    : 0;
  const wins = sessions.reduce((a, s) => a + s.wins, 0);
  const losses = sessions.reduce((a, s) => a + s.losses, 0);
  const matches = sessions.reduce((a, s) => a + s.matches, 0);
  // Streak achievements use the same "did anything" definition as the
  // dashboard streak: any tracked action keeps the day alive.
  const activeDays = new Set<string>([
    ...workoutDays,
    ...gamingDays,
    ...mealDays.keys(),
    ...activity.journalDays,
    ...suppDays.keys(),
    ...activity.goalCheckinDays,
  ]);

  const baseStats: Omit<AchievementStats, "level"> = {
    workouts: workouts.length,
    longestStreak: longestStreak(activeDays),
    mealDaysLogged: mealDays.size,
    proteinHitDays,
    journalEntries: journal.length,
    supplementPerfectDays,
    gamingMatches: matches,
    gamingWinRate: wins + losses > 0 ? Math.round((wins / (wins + losses)) * 100) : null,
    gamingDecided: wins + losses,
    goalsCompleted: activity.goalsCompleted,
    goalsCreated: goals.length,
    friends,
  };

  // XP + level converge in two passes (achievement bonus can raise level, which
  // can unlock level achievements).
  const xpBase = computeXp(activity, { calories: targets.calories, protein: targets.protein });
  let xp = xpBase;
  let stats: AchievementStats = { ...baseStats, level: levelForXp(xp).level };
  let ids = earnedIds(stats);
  xp = xpBase + achievementXp(ids);
  stats = { ...baseStats, level: levelForXp(xp).level };
  ids = earnedIds(stats);
  xp = xpBase + achievementXp(ids);

  const level = levelForXp(xp);
  return {
    xp,
    level,
    rank: rankForLevel(level.level),
    next: nextRank(level.level),
    stats: { ...baseStats, level: level.level },
    earned: ids.map((id) => ({ id, earned_on: "" })),
  };
}

/** Owner's progress: compute, persist newly-earned badges, return with dates. */
export async function getOwnProgress(): Promise<Progress | null> {
  const me = await currentUser();
  if (!me) return null;
  const db = await createClient();
  const progress = await loadProgress(db, me.id);

  const earnedIdsNow = progress.earned.map((e) => e.id);
  // Read existing rows; insert any newly earned with today's date.
  const { data: existing, error } = await db
    .from("achievements")
    .select("achievement_id, earned_on")
    .eq("user_id", me.id);
  if (error) {
    // table not created yet → return computed badges without dates
    return progress;
  }
  const have = new Map(
    (existing ?? []).map((r: { achievement_id: string; earned_on: string }) => [r.achievement_id, r.earned_on]),
  );
  const toInsert = earnedIdsNow.filter((id) => !have.has(id));
  if (toInsert.length > 0) {
    await db.from("achievements").insert(toInsert.map((id) => ({ user_id: me.id, achievement_id: id })));
    const today = new Date().toISOString().slice(0, 10);
    for (const id of toInsert) have.set(id, today);
  }
  progress.earned = earnedIdsNow.map((id) => ({ id, earned_on: have.get(id) ?? "" }));
  return progress;
}

/** Another user's progress, for their profile (no persistence). */
export async function getProfileProgress(userId: string): Promise<Progress | null> {
  if (!isAdminConfigured) return null;
  const db = createAdminClient();
  const progress = await loadProgress(db, userId);
  const { data: rows } = await db
    .from("achievements")
    .select("achievement_id, earned_on")
    .eq("user_id", userId);
  const have = new Map(
    (rows ?? []).map((r: { achievement_id: string; earned_on: string }) => [r.achievement_id, r.earned_on]),
  );
  // Show the intersection of computed + persisted (persisted carries the date).
  progress.earned = progress.earned
    .filter((e) => have.has(e.id))
    .map((e) => ({ id: e.id, earned_on: have.get(e.id) ?? "" }));
  return progress;
}
