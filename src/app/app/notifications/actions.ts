"use server";

import { createClient } from "@/lib/supabase/server";
import { currentUser } from "@/lib/auth";
import type { AppNotification } from "@/lib/notify";

export async function listNotifications(): Promise<{
  items: AppNotification[];
  unread: number;
}> {
  const me = await currentUser();
  if (!me) return { items: [], unread: 0 };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("notifications")
    .select("id, type, title, body, href, created_at, read_at")
    .order("created_at", { ascending: false })
    .limit(30);
  if (error) return { items: [], unread: 0 };
  const items = (data ?? []) as AppNotification[];
  return { items, unread: items.filter((n) => !n.read_at).length };
}

export async function markAllNotificationsRead(): Promise<void> {
  const me = await currentUser();
  if (!me) return;
  const supabase = await createClient();
  await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", me.id)
    .is("read_at", null);
}
