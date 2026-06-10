// Server-only notification helpers. Cross-user inserts go through the
// service-role client (RLS on notifications is owner-only); everything is
// best-effort — a missing table or key must never break the action that
// triggered the notification.

import { createAdminClient, isAdminConfigured } from "@/lib/supabase/admin";

export type NotificationType =
  | "achievement"
  | "friend_request"
  | "friend_accept"
  | "announcement";

export type AppNotification = {
  id: string;
  type: NotificationType | string;
  title: string;
  body: string | null;
  href: string | null;
  created_at: string;
  read_at: string | null;
};

export async function notifyUser(
  userId: string,
  n: { type: NotificationType; title: string; body?: string; href?: string },
): Promise<void> {
  if (!isAdminConfigured || !userId) return;
  try {
    const admin = createAdminClient();
    await admin.from("notifications").insert({
      user_id: userId,
      type: n.type,
      title: n.title.slice(0, 120),
      body: n.body?.slice(0, 300) ?? null,
      href: n.href ?? null,
    });
  } catch {
    /* best-effort */
  }
}

/** Announcement to every user (dev panel). Batched insert via service role. */
export async function notifyAllUsers(n: {
  title: string;
  body?: string;
  href?: string;
}): Promise<number> {
  if (!isAdminConfigured) return 0;
  try {
    const admin = createAdminClient();
    const { data: users } = await admin.from("profiles").select("id");
    const ids = ((users ?? []) as { id: string }[]).map((u) => u.id);
    if (ids.length === 0) return 0;
    const rows = ids.map((id) => ({
      user_id: id,
      type: "announcement",
      title: n.title.slice(0, 120),
      body: n.body?.slice(0, 300) ?? null,
      href: n.href ?? null,
    }));
    // Chunk to stay under payload limits at scale.
    for (let i = 0; i < rows.length; i += 500) {
      await admin.from("notifications").insert(rows.slice(i, i + 500));
    }
    return ids.length;
  } catch {
    return 0;
  }
}
