"use server";

import { createClient } from "@/lib/supabase/server";
import { currentUser } from "@/lib/auth";
import type { Message } from "@/lib/chat";

export async function sendMessage(
  recipientId: string,
  body: string,
): Promise<{ ok?: boolean; error?: string; message?: Message }> {
  const me = await currentUser();
  if (!me) return { error: "Session expired." };
  const text = (body ?? "").trim().slice(0, 4000);
  if (!text) return { error: "Message is empty." };
  if (!recipientId || recipientId === me.id) return { error: "Invalid recipient." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("messages")
    .insert({ sender_id: me.id, recipient_id: recipientId, body: text })
    .select("*")
    .single();

  if (error) {
    // RLS rejects non-friends / blocked, or the table isn't created yet.
    return { error: "Couldn't send. You can only message friends." };
  }
  return { ok: true, message: data as Message };
}

/** Messages with this friend newer than `afterIso` — the polling fallback for
 * when Realtime isn't delivering (e.g. table not in the realtime publication). */
export async function fetchMessagesSince(
  otherId: string,
  afterIso: string,
): Promise<Message[]> {
  const me = await currentUser();
  if (!me || !otherId) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("messages")
    .select("*")
    .or(
      `and(sender_id.eq.${me.id},recipient_id.eq.${otherId}),and(sender_id.eq.${otherId},recipient_id.eq.${me.id})`,
    )
    .gt("created_at", afterIso)
    .order("created_at", { ascending: true })
    .limit(50);
  return (data ?? []) as Message[];
}

export async function markRead(otherId: string): Promise<{ ok?: boolean }> {
  const me = await currentUser();
  if (!me || !otherId) return {};
  const supabase = await createClient();
  await supabase
    .from("messages")
    .update({ read_at: new Date().toISOString() })
    .eq("sender_id", otherId)
    .eq("recipient_id", me.id)
    .is("read_at", null);
  return { ok: true };
}
