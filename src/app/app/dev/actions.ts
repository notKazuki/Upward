"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient, isAdminConfigured } from "@/lib/supabase/admin";
import { currentUser } from "@/lib/auth";
import { notifyAllUsers } from "@/lib/notify";

/** True only when the signed-in user's profile carries is_admin. */
export async function isCurrentUserAdmin(): Promise<boolean> {
  const me = await currentUser();
  if (!me) return false;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", me.id)
    .maybeSingle();
  return !error && Boolean(data?.is_admin);
}

async function requireAdmin(): Promise<boolean> {
  return (await isCurrentUserAdmin()) && isAdminConfigured;
}

export type DevStats = {
  users: number;
  workouts: number;
  meals: number;
  gameSessions: number;
  journalEntries: number;
  goals: number;
  messages: number;
  achievementsEarned: number;
};

export async function getDevStats(): Promise<DevStats | null> {
  if (!(await requireAdmin())) return null;
  const admin = createAdminClient();
  const count = async (table: string) => {
    const { count: c } = await admin.from(table).select("*", { count: "exact", head: true });
    return c ?? 0;
  };
  const [users, workouts, meals, gameSessions, journalEntries, goals, messages, achievementsEarned] =
    await Promise.all([
      count("profiles"),
      count("workouts"),
      count("meals"),
      count("game_sessions"),
      count("journal_entries"),
      count("goals"),
      count("messages"),
      count("achievements"),
    ]);
  return { users, workouts, meals, gameSessions, journalEntries, goals, messages, achievementsEarned };
}

export type DevUser = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
  is_admin: boolean;
  workouts: number;
  meals: number;
  sessions: number;
};

export async function listAllUsers(): Promise<DevUser[]> {
  if (!(await requireAdmin())) return [];
  const admin = createAdminClient();

  const [pRes, wRes, mRes, sRes] = await Promise.all([
    admin
      .from("profiles")
      .select("id, username, display_name, avatar_url, created_at, is_admin")
      .order("created_at", { ascending: true })
      .limit(200),
    admin.from("workouts").select("user_id"),
    admin.from("meals").select("user_id"),
    admin.from("game_sessions").select("user_id"),
  ]);

  const tally = (rows: { user_id: string }[] | null | undefined) => {
    const m = new Map<string, number>();
    for (const r of rows ?? []) m.set(r.user_id, (m.get(r.user_id) ?? 0) + 1);
    return m;
  };
  const w = tally(wRes.data as { user_id: string }[]);
  const me = tally(mRes.data as { user_id: string }[]);
  const s = tally(sRes.data as { user_id: string }[]);

  return ((pRes.data ?? []) as Omit<DevUser, "workouts" | "meals" | "sessions">[]).map((p) => ({
    ...p,
    is_admin: Boolean(p.is_admin),
    workouts: w.get(p.id) ?? 0,
    meals: me.get(p.id) ?? 0,
    sessions: s.get(p.id) ?? 0,
  }));
}

export async function sendAnnouncement(input: {
  title: string;
  body?: string;
  href?: string;
}): Promise<{ ok?: boolean; error?: string; sent?: number }> {
  if (!(await requireAdmin())) return { error: "Not authorized." };
  const title = (input.title ?? "").trim().slice(0, 120);
  if (!title) return { error: "Give the announcement a title." };
  const href = (input.href ?? "").trim();
  if (href && !href.startsWith("/")) return { error: "Link must be an in-app path starting with /." };
  const sent = await notifyAllUsers({
    title,
    body: (input.body ?? "").trim().slice(0, 300) || undefined,
    href: href || undefined,
  });
  return { ok: true, sent };
}

export async function setUserAdmin(
  userId: string,
  makeAdmin: boolean,
): Promise<{ ok?: boolean; error?: string }> {
  const me = await currentUser();
  if (!me || !(await requireAdmin())) return { error: "Not authorized." };
  if (!userId) return { error: "Missing user." };
  if (userId === me.id && !makeAdmin) {
    return { error: "You can't remove your own admin access." };
  }
  const admin = createAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({ is_admin: makeAdmin })
    .eq("id", userId);
  if (error) return { error: "Couldn't update. Make sure you've run supabase/admin.sql." };
  revalidatePath("/app/dev");
  return { ok: true };
}
