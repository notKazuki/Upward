import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Avatar from "@/components/social/avatar";
import ChatThread from "@/components/social/chat-thread";
import { createClient } from "@/lib/supabase/server";
import { currentUser } from "@/lib/auth";
import { profileByUsername, relationshipTo } from "@/lib/social-data";
import { profileName } from "@/lib/social";
import type { Message } from "@/lib/chat";

export const metadata: Metadata = { title: "Chat — Upward" };

export default async function ChatThreadPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const me = await currentUser();
  const profile = await profileByUsername(username);
  if (!profile) notFound();

  const info = await relationshipTo(me!.id, profile.id);
  if (info.targetBlockedViewer) notFound();

  const name = profileName(profile);

  const header = (
    <div className="flex items-center gap-3">
      <Link href="/app/chat" className="grid size-8 place-items-center rounded-lg text-muted transition-colors hover:bg-card hover:text-ink" aria-label="Back to chats">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M15 18l-6-6 6-6" /></svg>
      </Link>
      <Link href={`/app/u/${profile.username}`} className="flex items-center gap-3">
        <Avatar profile={profile} size={40} />
        <div>
          <p className="font-medium text-ink">{name}</p>
          {profile.username && <p className="text-xs text-muted">@{profile.username}</p>}
        </div>
      </Link>
    </div>
  );

  if (info.rel !== "friend") {
    return (
      <div className="mx-auto max-w-2xl space-y-5">
        {header}
        <div className="rounded-2xl border border-line bg-card px-6 py-12 text-center">
          <p className="font-display text-xl text-ink">You&rsquo;re not friends yet</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted">
            You can message each other once you&rsquo;re friends.{" "}
            <Link href={`/app/u/${profile.username}`} className="font-medium text-ember hover:text-ink">
              View profile →
            </Link>
          </p>
        </div>
      </div>
    );
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("messages")
    .select("*")
    .or(
      `and(sender_id.eq.${me!.id},recipient_id.eq.${profile.id}),and(sender_id.eq.${profile.id},recipient_id.eq.${me!.id})`,
    )
    .order("created_at", { ascending: true })
    .limit(200);
  const initial = (data ?? []) as Message[];

  return (
    <div className="mx-auto flex h-[calc(100dvh-7rem)] max-w-2xl flex-col gap-4">
      {header}
      <ChatThread
        meId={me!.id}
        otherId={profile.id}
        otherName={name}
        initial={initial}
      />
    </div>
  );
}
