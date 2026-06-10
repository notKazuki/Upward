// Server-only web push. Sends to every device a user has subscribed, pruning
// endpoints the push service reports dead (404/410). Best-effort everywhere —
// a missing key or table must never break the action that triggered the push.

import webpush from "web-push";
import { createAdminClient, isAdminConfigured } from "@/lib/supabase/admin";

const PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;

export const isPushConfigured = Boolean(PUBLIC_KEY && PRIVATE_KEY && isAdminConfigured);

let initialized = false;
function init(): boolean {
  if (!isPushConfigured) return false;
  if (!initialized) {
    webpush.setVapidDetails("mailto:admin@upward.app", PUBLIC_KEY!, PRIVATE_KEY!);
    initialized = true;
  }
  return true;
}

export type PushPayload = {
  title: string;
  body?: string;
  href?: string;
  /** Same tag replaces a previous notification instead of stacking. */
  tag?: string;
};

type SubRow = { id: string; endpoint: string; p256dh: string; auth: string };

/** Push to all of a user's devices. Returns how many sends succeeded. */
export async function sendPushToUser(
  userId: string,
  payload: PushPayload,
): Promise<number> {
  if (!init() || !userId) return 0;
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth")
      .eq("user_id", userId);
    const subs = (data ?? []) as SubRow[];
    if (subs.length === 0) return 0;

    let ok = 0;
    const dead: string[] = [];
    await Promise.all(
      subs.map(async (s) => {
        try {
          await webpush.sendNotification(
            { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
            JSON.stringify(payload),
            { TTL: 60 * 60 * 12 },
          );
          ok++;
        } catch (e) {
          const code = (e as { statusCode?: number })?.statusCode;
          if (code === 404 || code === 410) dead.push(s.id);
        }
      }),
    );
    if (dead.length > 0) {
      await admin.from("push_subscriptions").delete().in("id", dead);
    }
    return ok;
  } catch {
    return 0;
  }
}
