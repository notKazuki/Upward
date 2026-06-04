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
