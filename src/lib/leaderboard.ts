// Friends leaderboard — weekly XP, streak, workouts and win rate for you +
// your friends. Server-only (service-role reads, same trust model as shared
// profiles: being friends grants leaderboard presence).

import { createClient } from "@/lib/supabase/server";
import { createAdminClient, isAdminConfigured } from "@/lib/supabase/admin";
import { currentUser } from "@/lib/auth";
import { profilesByIds } from "@/lib/social-data";
import { computeXp, type DailyActivity } from "@/lib/levels";
import type { PublicProfile } from "@/lib/social";

export type LeaderboardRow = {
  profile: PublicProfile;
  isMe: boolean;
  weeklyXp: number;
  streak: number;
  workouts7: number;
  winRate7: number | null;
  matches7: number;
};

export type LeaderboardMetric = "xp" | "streak" | "workouts" | "winrate";

function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return ymd(d);
}

export async function buildLeaderboard(): Promise<LeaderboardRow[] | null> {
  const me = await currentUser();
  if (!me || !isAdminConfigured) return null;

  const supabase = await createClient();
  const { data: fr, error } = await supabase
    .from("friendships")
    .select("requester_id, addressee_id")
    .eq("status", "accepted")
    .or(`requester_id.eq.${me.id},addressee_id.eq.${me.id}`);
  if (error) return null;

  const ids = [
    me.id,
    ...((fr ?? []) as { requester_id: string; addressee_id: string }[]).map((r) =>
      r.requester_id === me.id ? r.addressee_id : r.requester_id,
    ),
  ];

  const admin = createAdminClient();
  const since = daysAgo(59); // enough history for a current streak
  const week = daysAgo(6);

  const [wRes, sRes, mRes, jRes, slRes, glRes, suppRes, profiles] = await Promise.all([
    admin.from("workouts").select("user_id, performed_on").in("user_id", ids).gte("performed_on", since),
    admin.from("game_sessions").select("user_id, played_on, matches, wins, losses").in("user_id", ids).gte("played_on", since),
    admin.from("meals").select("user_id, eaten_on").in("user_id", ids).gte("eaten_on", since),
    admin.from("journal_entries").select("user_id, entry_date").in("user_id", ids).gte("entry_date", since),
    admin.from("supplement_logs").select("user_id, taken_on, supplement_id").in("user_id", ids).gte("taken_on", since),
    admin.from("goal_logs").select("user_id, logged_on").in("user_id", ids).gte("logged_on", since),
    admin.from("supplements").select("user_id, id").in("user_id", ids),
    profilesByIds(ids),
  ]);

  type Row = Record<string, string> & { user_id: string };
  const group = <T extends { user_id: string }>(rows: T[] | null | undefined) => {
    const m = new Map<string, T[]>();
    for (const r of rows ?? []) {
      const arr = m.get(r.user_id) ?? [];
      arr.push(r);
      m.set(r.user_id, arr);
    }
    return m;
  };

  const wBy = group((wRes.data ?? []) as Row[]);
  const sBy = group((sRes.data ?? []) as (Row & { matches: number; wins: number; losses: number })[]);
  const mBy = group((mRes.data ?? []) as Row[]);
  const jBy = group((jRes.data ?? []) as Row[]);
  const slBy = group((slRes.data ?? []) as Row[]);
  const glBy = group((glRes.data ?? []) as Row[]);
  const suppCount = new Map<string, number>();
  for (const r of (suppRes.data ?? []) as { user_id: string }[]) {
    suppCount.set(r.user_id, (suppCount.get(r.user_id) ?? 0) + 1);
  }

  const today = ymd(new Date());
  const rows: LeaderboardRow[] = [];

  for (const id of ids) {
    const profile = profiles.get(id);
    if (!profile) continue;

    const workouts = wBy.get(id) ?? [];
    const sessions = sBy.get(id) ?? [];
    const meals = mBy.get(id) ?? [];
    const journal = jBy.get(id) ?? [];
    const suppLogs = slBy.get(id) ?? [];
    const goalLogs = glBy.get(id) ?? [];

    // Weekly XP via the same engine as Progress, scoped to the last 7 days.
    // Nutrition-target bonuses are skipped (no per-user target context here),
    // so the comparison is apples-to-apples across the board.
    const inWeek = (d: string) => d >= week;
    const mealDays = new Map<string, { calories: number; protein: number }>();
    for (const m of meals) if (inWeek(m.eaten_on)) mealDays.set(m.eaten_on, { calories: 0, protein: 0 });
    const suppDays = new Map<string, number>();
    for (const l of suppLogs) if (inWeek(l.taken_on)) suppDays.set(l.taken_on, (suppDays.get(l.taken_on) ?? 0) + 1);
    const activity: DailyActivity = {
      workoutDays: new Set(workouts.filter((w) => inWeek(w.performed_on)).map((w) => w.performed_on)),
      mealDays,
      journalDays: new Set(journal.filter((j) => inWeek(j.entry_date)).map((j) => j.entry_date)),
      supplementDays: suppDays,
      gamingDays: new Set(sessions.filter((s) => inWeek(s.played_on)).map((s) => s.played_on)),
      goalCheckinDays: new Set(goalLogs.filter((g) => inWeek(g.logged_on)).map((g) => g.logged_on)),
      goalsCompleted: 0, // completions are all-time XP; excluded from the weekly race
      supplementsInStack: suppCount.get(id) ?? 0,
    };
    const weeklyXp = computeXp(activity, {});

    // Current streak (any activity, ending today or yesterday).
    const active = new Set<string>([
      ...workouts.map((w) => w.performed_on),
      ...sessions.map((s) => s.played_on),
      ...meals.map((m) => m.eaten_on),
      ...journal.map((j) => j.entry_date),
      ...suppLogs.map((l) => l.taken_on),
      ...goalLogs.map((g) => g.logged_on),
    ]);
    let streak = 0;
    const cursor = new Date(`${today}T00:00:00`);
    if (!active.has(ymd(cursor))) cursor.setDate(cursor.getDate() - 1);
    while (active.has(ymd(cursor))) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    }

    const week7 = sessions.filter((s) => inWeek(s.played_on));
    const wins = week7.reduce((a, s) => a + s.wins, 0);
    const losses = week7.reduce((a, s) => a + s.losses, 0);

    rows.push({
      profile,
      isMe: id === me.id,
      weeklyXp,
      streak,
      workouts7: workouts.filter((w) => inWeek(w.performed_on)).length,
      winRate7: wins + losses > 0 ? Math.round((wins / (wins + losses)) * 100) : null,
      matches7: week7.reduce((a, s) => a + s.matches, 0),
    });
  }

  return rows;
}

export function sortLeaderboard(rows: LeaderboardRow[], metric: LeaderboardMetric): LeaderboardRow[] {
  const sorted = [...rows];
  switch (metric) {
    case "streak":
      sorted.sort((a, b) => b.streak - a.streak || b.weeklyXp - a.weeklyXp);
      break;
    case "workouts":
      sorted.sort((a, b) => b.workouts7 - a.workouts7 || b.weeklyXp - a.weeklyXp);
      break;
    case "winrate":
      sorted.sort((a, b) => (b.winRate7 ?? -1) - (a.winRate7 ?? -1) || b.matches7 - a.matches7);
      break;
    default:
      sorted.sort((a, b) => b.weeklyXp - a.weeklyXp || b.streak - a.streak);
  }
  return sorted;
}
