// Server-only social data access. Cross-user reads use the service-role client
// AFTER the relationship + privacy are resolved in code (RLS on the underlying
// trackers is owner-only, by design). Never import into a Client Component.

import { createAdminClient, isAdminConfigured } from "@/lib/supabase/admin";
import {
  canView,
  type PrivacyMap,
  type PublicProfile,
  type Relationship,
} from "@/lib/social";
import { progressPct, type Goal, type GoalLog } from "@/lib/goals";

type Admin = ReturnType<typeof createAdminClient>;
function admin(): Admin | null {
  return isAdminConfigured ? createAdminClient() : null;
}

export type ProfileRow = PublicProfile & {
  privacy: PrivacyMap;
  created_at: string;
};

const PROFILE_COLS = "id, username, display_name, avatar_url, bio, privacy, created_at";

export async function profileByUsername(username: string): Promise<ProfileRow | null> {
  const db = admin();
  if (!db || !username) return null;
  const { data } = await db
    .from("profiles")
    .select(PROFILE_COLS)
    .ilike("username", username)
    .maybeSingle();
  return (data as ProfileRow) ?? null;
}

export async function profilesByIds(ids: string[]): Promise<Map<string, ProfileRow>> {
  const out = new Map<string, ProfileRow>();
  const db = admin();
  if (!db || ids.length === 0) return out;
  const { data } = await db.from("profiles").select(PROFILE_COLS).in("id", ids);
  for (const p of (data ?? []) as ProfileRow[]) out.set(p.id, p);
  return out;
}

export type RelationshipInfo = {
  rel: Relationship;
  outgoingPending: boolean;
  incomingPending: boolean;
  viewerBlockedTarget: boolean;
  targetBlockedViewer: boolean;
};

export async function relationshipTo(
  viewerId: string,
  targetId: string,
): Promise<RelationshipInfo> {
  const base: RelationshipInfo = {
    rel: "stranger",
    outgoingPending: false,
    incomingPending: false,
    viewerBlockedTarget: false,
    targetBlockedViewer: false,
  };
  if (viewerId === targetId) return { ...base, rel: "self" };
  const db = admin();
  if (!db) return base;

  const [fr, blocks] = await Promise.all([
    db
      .from("friendships")
      .select("requester_id, addressee_id, status")
      .or(
        `and(requester_id.eq.${viewerId},addressee_id.eq.${targetId}),and(requester_id.eq.${targetId},addressee_id.eq.${viewerId})`,
      ),
    db
      .from("blocks")
      .select("blocker_id, blocked_id")
      .or(
        `and(blocker_id.eq.${viewerId},blocked_id.eq.${targetId}),and(blocker_id.eq.${targetId},blocked_id.eq.${viewerId})`,
      ),
  ]);

  const rows = (fr.data ?? []) as { requester_id: string; addressee_id: string; status: string }[];
  const info = { ...base };
  for (const r of rows) {
    if (r.status === "accepted") info.rel = "friend";
    else if (r.requester_id === viewerId) info.outgoingPending = true;
    else info.incomingPending = true;
  }
  for (const b of (blocks.data ?? []) as { blocker_id: string; blocked_id: string }[]) {
    if (b.blocker_id === viewerId) info.viewerBlockedTarget = true;
    else info.targetBlockedViewer = true;
  }
  return info;
}

// --- shared stats ----------------------------------------------------------
export type SharedStats = {
  memberSince: string | null;
  stats?: { streak: number; activeDays30: number };
  workouts?: { total: number; perWeek: number; topDay: string | null };
  nutrition?: { loggingRatePct: number; avgCalories: number | null };
  gaming?: { games: number; matches: number; winRate: number | null };
  goals?: { active: number; completed: number };
};

function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Build the visible slice of a target's stats for a viewer with `rel`. */
export async function buildSharedStats(
  target: ProfileRow,
  rel: Relationship,
): Promise<SharedStats> {
  const db = admin();
  const out: SharedStats = { memberSince: target.created_at ?? null };
  if (!db) return out;
  const privacy = target.privacy ?? {};
  const show = (s: Parameters<typeof canView>[1]) => canView(privacy, s, rel);

  const since30 = ymd(new Date(Date.now() - 29 * 86_400_000));
  const since60 = ymd(new Date(Date.now() - 59 * 86_400_000));

  const wantStats = show("stats");
  const wantWorkouts = show("workouts");
  const wantNutrition = show("nutrition");
  const wantGaming = show("gaming");
  const wantGoals = show("goals");

  const [wRes, sRes, mRes, gamesRes, goalsRes] = await Promise.all([
    wantStats || wantWorkouts
      ? db.from("workouts").select("performed_on, category").eq("user_id", target.id).gte("performed_on", since60)
      : Promise.resolve({ data: [] }),
    wantStats || wantGaming
      ? db.from("game_sessions").select("game_id, played_on, matches, wins, losses").eq("user_id", target.id).gte("played_on", since60)
      : Promise.resolve({ data: [] }),
    wantNutrition
      ? db.from("meals").select("eaten_on, calories").eq("user_id", target.id).gte("eaten_on", since30)
      : Promise.resolve({ data: [] }),
    wantGaming ? db.from("games").select("id").eq("user_id", target.id) : Promise.resolve({ data: [] }),
    wantGoals ? db.from("goals").select("status").eq("user_id", target.id) : Promise.resolve({ data: [] }),
  ]);

  const workouts = (wRes.data ?? []) as { performed_on: string; category: string }[];
  const sessions = (sRes.data ?? []) as { game_id: string; played_on: string; matches: number; wins: number; losses: number }[];

  if (wantStats) {
    const active = new Set<string>([...workouts.map((w) => w.performed_on), ...sessions.map((s) => s.played_on)]);
    // streak ending today or yesterday
    let streak = 0;
    const d = new Date();
    if (!active.has(ymd(d))) d.setDate(d.getDate() - 1);
    while (active.has(ymd(d))) {
      streak++;
      d.setDate(d.getDate() - 1);
    }
    const activeDays30 = [...active].filter((x) => x >= since30).length;
    out.stats = { streak, activeDays30 };
  }

  if (wantWorkouts) {
    const w30 = workouts.filter((w) => w.performed_on >= since30);
    const cat = new Map<string, number>();
    for (const w of workouts) cat.set(w.category, (cat.get(w.category) ?? 0) + 1);
    const topDay = [...cat.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
    out.workouts = { total: workouts.length, perWeek: Math.round((w30.length / 30) * 7 * 10) / 10, topDay };
  }

  if (wantNutrition) {
    const meals = (mRes.data ?? []) as { eaten_on: string; calories: number }[];
    const byDay = new Map<string, number>();
    for (const m of meals) byDay.set(m.eaten_on, (byDay.get(m.eaten_on) ?? 0) + (m.calories || 0));
    const loggedDays = byDay.size;
    const avg = loggedDays ? Math.round([...byDay.values()].reduce((a, b) => a + b, 0) / loggedDays) : null;
    out.nutrition = { loggingRatePct: Math.round((loggedDays / 30) * 100), avgCalories: avg };
  }

  if (wantGaming) {
    const wins = sessions.reduce((a, s) => a + s.wins, 0);
    const losses = sessions.reduce((a, s) => a + s.losses, 0);
    const matches = sessions.reduce((a, s) => a + s.matches, 0);
    const games = ((gamesRes.data ?? []) as { id: string }[]).length;
    out.gaming = { games, matches, winRate: wins + losses > 0 ? Math.round((wins / (wins + losses)) * 100) : null };
  }

  if (wantGoals) {
    const gs = (goalsRes.data ?? []) as { status: string }[];
    out.goals = {
      active: gs.filter((g) => g.status === "active").length,
      completed: gs.filter((g) => g.status === "completed").length,
    };
  }

  return out;
}

// --- shared detail feeds (what friends actually see) ------------------------
export type SharedWorkout = {
  performed_on: string;
  title: string;
  category: string;
  duration_min: number | null;
  exercises: { exercise: string; sets: string[] }[];
};
export type SharedMealDay = { eaten_on: string; items: number; calories: number; protein: number };
export type SharedGoal = { title: string; pct: number; status: string };
export type SharedJournalEntry = { entry_date: string; mood: string | null; body: string | null };

export type SharedDetails = {
  workouts?: SharedWorkout[];
  mealDays?: SharedMealDay[];
  goalsList?: SharedGoal[];
  journal?: SharedJournalEntry[];
};

/**
 * The richer feeds shown on a profile — recent workouts (with sets), recent
 * meal days, goal progress, and journal entries (text + mood only; photos are
 * never shared). Each list is fetched only if the section's privacy allows.
 */
export async function buildSharedDetails(
  target: ProfileRow,
  rel: Relationship,
): Promise<SharedDetails> {
  const db = admin();
  const out: SharedDetails = {};
  if (!db) return out;
  const privacy = target.privacy ?? {};
  const show = (s: Parameters<typeof canView>[1]) => canView(privacy, s, rel);

  const [wRes, mRes, gRes, glRes, jRes] = await Promise.all([
    show("workouts")
      ? db
          .from("workouts")
          .select("id, performed_on, title, category, duration_min")
          .eq("user_id", target.id)
          .order("performed_on", { ascending: false })
          .order("created_at", { ascending: false })
          .limit(5)
      : Promise.resolve({ data: [] }),
    show("nutrition")
      ? db
          .from("meals")
          .select("eaten_on, calories, protein")
          .eq("user_id", target.id)
          .order("eaten_on", { ascending: false })
          .limit(120)
      : Promise.resolve({ data: [] }),
    show("goals")
      ? db
          .from("goals")
          .select("*")
          .eq("user_id", target.id)
          .eq("status", "active")
          .order("created_at", { ascending: true })
          .limit(6)
      : Promise.resolve({ data: [] }),
    show("goals")
      ? db.from("goal_logs").select("goal_id, logged_on, value").eq("user_id", target.id)
      : Promise.resolve({ data: [] }),
    show("journal")
      ? db
          .from("journal_entries")
          .select("entry_date, mood, body")
          .eq("user_id", target.id)
          .order("entry_date", { ascending: false })
          .limit(3)
      : Promise.resolve({ data: [] }),
  ]);

  // Workouts + their sets.
  const workouts = (wRes.data ?? []) as {
    id: string;
    performed_on: string;
    title: string;
    category: string;
    duration_min: number | null;
  }[];
  if (workouts.length > 0) {
    const { data: setRows } = await db
      .from("workout_sets")
      .select("workout_id, exercise, set_index, weight, reps")
      .in("workout_id", workouts.map((w) => w.id))
      .order("set_index", { ascending: true });
    const byWorkout = new Map<string, { exercise: string; sets: string[] }[]>();
    for (const s of (setRows ?? []) as { workout_id: string; exercise: string; weight: number | null; reps: number | null }[]) {
      const list = byWorkout.get(s.workout_id) ?? [];
      let entry = list.find((e) => e.exercise === s.exercise);
      if (!entry) {
        entry = { exercise: s.exercise, sets: [] };
        list.push(entry);
      }
      const label =
        s.weight != null && s.reps != null
          ? `${s.weight}×${s.reps}`
          : s.reps != null
            ? `${s.reps}`
            : s.weight != null
              ? `${s.weight}`
              : "";
      if (label) entry.sets.push(label);
      byWorkout.set(s.workout_id, list);
    }
    out.workouts = workouts.map((w) => ({
      performed_on: w.performed_on,
      title: w.title,
      category: w.category,
      duration_min: w.duration_min,
      exercises: byWorkout.get(w.id) ?? [],
    }));
  } else if (show("workouts")) {
    out.workouts = [];
  }

  // Meals grouped into days (last 5 logged days).
  if (show("nutrition")) {
    const byDay = new Map<string, { items: number; calories: number; protein: number }>();
    for (const m of (mRes.data ?? []) as { eaten_on: string; calories: number; protein: number }[]) {
      const cur = byDay.get(m.eaten_on) ?? { items: 0, calories: 0, protein: 0 };
      cur.items += 1;
      cur.calories += m.calories || 0;
      cur.protein += m.protein || 0;
      byDay.set(m.eaten_on, cur);
    }
    out.mealDays = [...byDay.entries()]
      .sort((a, b) => b[0].localeCompare(a[0]))
      .slice(0, 5)
      .map(([eaten_on, v]) => ({ eaten_on, ...v }));
  }

  // Goals with progress.
  if (show("goals")) {
    const goalLogs = (glRes.data ?? []) as GoalLog[];
    const logsByGoal = new Map<string, GoalLog[]>();
    for (const l of goalLogs) {
      const arr = logsByGoal.get(l.goal_id) ?? [];
      arr.push(l);
      logsByGoal.set(l.goal_id, arr);
    }
    out.goalsList = ((gRes.data ?? []) as Goal[]).map((g) => ({
      title: g.title,
      pct: progressPct(g, logsByGoal.get(g.id) ?? []),
      status: g.status,
    }));
  }

  // Journal — text + mood only by design; photos never leave the private bucket.
  if (show("journal")) {
    out.journal = ((jRes.data ?? []) as SharedJournalEntry[]).map((e) => ({
      entry_date: e.entry_date,
      mood: e.mood,
      body: e.body ? e.body.slice(0, 600) : null,
    }));
  }

  return out;
}
