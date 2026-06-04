import type { Metadata } from "next";
import Link from "next/link";
import DashboardCard from "@/components/dashboard/card";
import Avatar from "@/components/social/avatar";
import { createClient } from "@/lib/supabase/server";
import { currentUser } from "@/lib/auth";
import { profilesByIds } from "@/lib/social-data";
import { profileName } from "@/lib/social";
import { timeLabel, type Message } from "@/lib/chat";

export const metadata: Metadata = { title: "Chat — Upward" };

export default async function ChatPage() {
  const me = await currentUser();
  const supabase = await createClient();

  // Accepted friends.
  const { data: frData, error: frErr } = await supabase
    .from("friendships")
    .select("requester_id, addressee_id, status")
    .eq("status", "accepted")
    .or(`requester_id.eq.${me!.id},addressee_id.eq.${me!.id}`);

  if (frErr) {
    return (
      <div className="mx-auto max-w-2xl space-y-5">
        <Header />
        <DashboardCard title="One step left">
          <p className="text-sm leading-relaxed text-muted">
            Run <code className="text-ink">supabase/social.sql</code> first, then refresh.
          </p>
        </DashboardCard>
      </div>
    );
  }

  const friendIds = (frData ?? []).map((r) =>
    r.requester_id === me!.id ? r.addressee_id : r.requester_id,
  );

  // Messages involving me (newest first). Tolerate a missing chat table.
  const { data: msgData, error: msgErr } = await supabase
    .from("messages")
    .select("*")
    .or(`sender_id.eq.${me!.id},recipient_id.eq.${me!.id}`)
    .order("created_at", { ascending: false });
  const chatReady = !msgErr;
  const messages = (msgData ?? []) as Message[];

  const profiles = await profilesByIds(friendIds);

  const other = (m: Message) => (m.sender_id === me!.id ? m.recipient_id : m.sender_id);
  const last = new Map<string, Message>();
  const unread = new Map<string, number>();
  for (const m of messages) {
    const o = other(m);
    if (!last.has(o)) last.set(o, m); // first seen = newest
    if (m.recipient_id === me!.id && !m.read_at) unread.set(o, (unread.get(o) ?? 0) + 1);
  }

  const convos = friendIds
    .map((id) => ({ id, profile: profiles.get(id), lastMsg: last.get(id), unread: unread.get(id) ?? 0 }))
    .filter((c) => c.profile)
    .sort((a, b) => {
      const at = a.lastMsg ? a.lastMsg.created_at : "";
      const bt = b.lastMsg ? b.lastMsg.created_at : "";
      return bt.localeCompare(at);
    });

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <Header />

      {!chatReady && (
        <DashboardCard title="One step left">
          <p className="text-sm leading-relaxed text-muted">
            Run <code className="text-ink">supabase/chat.sql</code> in Supabase →{" "}
            <b>SQL Editor</b> to enable messaging, then refresh.
          </p>
        </DashboardCard>
      )}

      {convos.length === 0 ? (
        <div className="rounded-2xl border border-line bg-card px-6 py-12 text-center">
          <p className="font-display text-xl text-ink">No conversations yet</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted">
            Add some friends, then message them here.{" "}
            <Link href="/app/friends" className="font-medium text-ember hover:text-ink">
              Find friends →
            </Link>
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {convos.map((c) => (
            <li key={c.id}>
              <Link
                href={`/app/chat/${c.profile!.username}`}
                className="flex items-center gap-3 rounded-xl border border-line bg-card px-4 py-3 transition-colors hover:border-line-strong"
              >
                <Avatar profile={c.profile!} size={44} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate font-medium text-ink">{profileName(c.profile!)}</p>
                    {c.lastMsg && (
                      <span className="shrink-0 text-xs text-faint">{timeLabel(c.lastMsg.created_at)}</span>
                    )}
                  </div>
                  <p className="truncate text-sm text-muted">
                    {c.lastMsg
                      ? `${c.lastMsg.sender_id === me!.id ? "You: " : ""}${c.lastMsg.body}`
                      : "Say hi"}
                  </p>
                </div>
                {c.unread > 0 && (
                  <span className="grid min-w-5 shrink-0 place-items-center rounded-full bg-ember px-1.5 text-xs font-semibold text-paper-bright">
                    {c.unread}
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Header() {
  return (
    <div>
      <h1 className="font-display text-[2rem] font-normal tracking-tight text-ink">Chat</h1>
      <p className="mt-1 text-sm text-muted">Direct messages with your friends.</p>
    </div>
  );
}
