"use server";

import { createClient } from "@/lib/supabase/server";
import { currentUser } from "@/lib/auth";
import { profilesByIds } from "@/lib/social-data";
import type { PublicProfile } from "@/lib/social";
import type { Message } from "@/lib/chat";

export type Conversation = {
  profile: PublicProfile;
  lastBody: string | null;
  lastAt: string | null;
  lastMine: boolean;
  unread: number;
};

/** Conversation list (friends + last message + unread) — powers the chat dock. */
export async function listConversations(): Promise<{
  conversations: Conversation[];
  meId: string;
  totalUnread: number;
}> {
  const me = await currentUser();
  if (!me) return { conversations: [], meId: "", totalUnread: 0 };
  const supabase = await createClient();

  const [frRes, msgRes] = await Promise.all([
    supabase
      .from("friendships")
      .select("requester_id, addressee_id")
      .eq("status", "accepted")
      .or(`requester_id.eq.${me.id},addressee_id.eq.${me.id}`),
    supabase
      .from("messages")
      .select("*")
      .or(`sender_id.eq.${me.id},recipient_id.eq.${me.id}`)
      .order("created_at", { ascending: false })
      .limit(300),
  ]);

  const friendIds = ((frRes.data ?? []) as { requester_id: string; addressee_id: string }[]).map(
    (r) => (r.requester_id === me.id ? r.addressee_id : r.requester_id),
  );
  const messages = (msgRes.error ? [] : (msgRes.data ?? [])) as Message[];
  const profiles = await profilesByIds(friendIds);

  const other = (m: Message) => (m.sender_id === me.id ? m.recipient_id : m.sender_id);
  const last = new Map<string, Message>();
  const unread = new Map<string, number>();
  for (const m of messages) {
    const o = other(m);
    if (!last.has(o)) last.set(o, m);
    if (m.recipient_id === me.id && !m.read_at) unread.set(o, (unread.get(o) ?? 0) + 1);
  }

  const conversations = friendIds
    .map((id) => {
      const p = profiles.get(id);
      if (!p) return null;
      const lm = last.get(id) ?? null;
      return {
        profile: { id: p.id, username: p.username, display_name: p.display_name, avatar_url: p.avatar_url, bio: p.bio },
        lastBody: lm?.body ?? null,
        lastAt: lm?.created_at ?? null,
        lastMine: lm ? lm.sender_id === me.id : false,
        unread: unread.get(id) ?? 0,
      };
    })
    .filter((c): c is Conversation => c !== null)
    .sort((a, b) => (b.lastAt ?? "").localeCompare(a.lastAt ?? ""));

  return {
    conversations,
    meId: me.id,
    totalUnread: conversations.reduce((s, c) => s + c.unread, 0),
  };
}

/** Full thread with one friend — powers the dock's embedded thread view. */
export async function fetchThread(otherId: string): Promise<Message[]> {
  const me = await currentUser();
  if (!me || !otherId) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("messages")
    .select("*")
    .or(
      `and(sender_id.eq.${me.id},recipient_id.eq.${otherId}),and(sender_id.eq.${otherId},recipient_id.eq.${me.id})`,
    )
    .order("created_at", { ascending: true })
    .limit(200);
  return (data ?? []) as Message[];
}

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
