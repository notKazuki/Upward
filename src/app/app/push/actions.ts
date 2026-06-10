"use server";

import { createClient } from "@/lib/supabase/server";
import { currentUser } from "@/lib/auth";

/** Register this device's push subscription (idempotent on endpoint). */
export async function savePushSubscription(sub: {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}): Promise<{ ok?: boolean; error?: string }> {
  const me = await currentUser();
  if (!me) return { error: "Session expired." };
  if (!sub?.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) {
    return { error: "Invalid subscription." };
  }
  const supabase = await createClient();
  // Endpoint is globally unique; re-subscribing replaces the old row.
  await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
  const { error } = await supabase.from("push_subscriptions").insert({
    user_id: me.id,
    endpoint: sub.endpoint,
    p256dh: sub.keys.p256dh,
    auth: sub.keys.auth,
  });
  if (error) {
    return { error: "Couldn't save. Make sure you've run supabase/push.sql." };
  }
  return { ok: true };
}

export async function deletePushSubscription(endpoint: string): Promise<{ ok?: boolean }> {
  const me = await currentUser();
  if (!me || !endpoint) return {};
  const supabase = await createClient();
  await supabase
    .from("push_subscriptions")
    .delete()
    .eq("endpoint", endpoint)
    .eq("user_id", me.id);
  return { ok: true };
}

/** Persist the user's IANA timezone so reminders fire in local time. */
export async function saveTimezone(tz: string): Promise<{ ok?: boolean }> {
  const me = await currentUser();
  if (!me) return {};
  const clean = (tz ?? "").trim().slice(0, 64);
  if (!clean || !/^[A-Za-z_/+-]+$/.test(clean)) return {};
  const supabase = await createClient();
  await supabase.from("profiles").update({ timezone: clean }).eq("id", me.id);
  return { ok: true };
}
