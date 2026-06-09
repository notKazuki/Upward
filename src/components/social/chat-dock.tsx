"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Avatar from "./avatar";
import ChatThread from "./chat-thread";
import { profileName, type PublicProfile } from "@/lib/social";
import {
  listConversations,
  fetchThread,
  type Conversation,
} from "@/app/app/chat/actions";
import type { Message } from "@/lib/chat";

/**
 * Floating mini-chat: a small icon beside the theme toggle that opens a
 * compact conversation panel — list view, then an embedded live thread.
 */
export default function ChatDock() {
  const [open, setOpen] = useState(false);
  const [convos, setConvos] = useState<Conversation[]>([]);
  const [meId, setMeId] = useState("");
  const [totalUnread, setTotalUnread] = useState(0);
  const [active, setActive] = useState<{ profile: PublicProfile; initial: Message[] } | null>(null);
  const [loadingThread, setLoadingThread] = useState(false);

  async function refresh() {
    const res = await listConversations();
    setConvos(res.conversations);
    setMeId(res.meId);
    setTotalUnread(res.totalUnread);
  }

  useEffect(() => {
    void refresh();
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, 45_000);
    return () => window.clearInterval(id);
  }, []);

  async function openThread(c: Conversation) {
    setLoadingThread(true);
    const initial = await fetchThread(c.profile.id);
    setActive({ profile: c.profile, initial });
    setLoadingThread(false);
    setTotalUnread((t) => Math.max(0, t - c.unread));
    setConvos((prev) =>
      prev.map((x) => (x.profile.id === c.profile.id ? { ...x, unread: 0 } : x)),
    );
  }

  function close() {
    setOpen(false);
    setActive(null);
  }

  return (
    <>
      {/* Launcher — sits just left of the theme toggle FAB */}
      <button
        type="button"
        onClick={() => (open ? close() : setOpen(true))}
        aria-label={totalUnread > 0 ? `Chat, ${totalUnread} unread` : "Chat"}
        aria-expanded={open}
        style={{
          bottom: "calc(1.25rem + env(safe-area-inset-bottom))",
          right: "calc(4.5rem + env(safe-area-inset-right))",
        }}
        className="fixed z-40 grid size-11 cursor-pointer place-items-center rounded-full border border-line bg-card/90 text-ink-soft shadow-[0_8px_24px_-8px_rgba(0,0,0,0.3)] backdrop-blur-md transition-all duration-300 hover:border-ember hover:text-ember"
      >
        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M21 11.5a8.4 8.4 0 0 1-8.5 8.5 8.6 8.6 0 0 1-4-1L3 21l2-5.5A8.5 8.5 0 0 1 12.5 3 8.4 8.4 0 0 1 21 11.5Z" />
        </svg>
        {totalUnread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 grid min-w-4 place-items-center rounded-full bg-ember px-1 text-[0.6rem] font-semibold leading-4 text-paper-bright">
            {totalUnread > 9 ? "9+" : totalUnread}
          </span>
        )}
      </button>

      {/* Panel */}
      {open && (
        <div
          style={{ bottom: "calc(4.5rem + env(safe-area-inset-bottom))" }}
          className="u-anim-menu fixed right-4 z-40 flex h-[28rem] w-[22rem] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border border-line bg-card shadow-[0_24px_60px_-24px_rgba(0,0,0,0.55)]"
        >
          {/* Header */}
          <div className="flex items-center justify-between gap-2 border-b border-line px-3.5 py-2.5">
            {active ? (
              <button
                type="button"
                onClick={() => setActive(null)}
                className="flex min-w-0 cursor-pointer items-center gap-2 text-left"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-muted" aria-hidden><path d="M15 18l-6-6 6-6" /></svg>
                <Avatar profile={active.profile} size={26} />
                <span className="truncate text-sm font-medium text-ink">
                  {profileName(active.profile)}
                </span>
              </button>
            ) : (
              <p className="text-sm font-medium text-ink">Chat</p>
            )}
            <div className="flex shrink-0 items-center gap-1">
              <Link
                href={active?.profile.username ? `/app/chat/${active.profile.username}` : "/app/chat"}
                onClick={close}
                aria-label="Open full chat"
                className="grid size-7 place-items-center rounded-lg text-faint transition-colors hover:bg-paper hover:text-ink"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M14 4h6v6M20 4l-9 9" /><path d="M18 14v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h5" /></svg>
              </Link>
              <button
                type="button"
                onClick={close}
                aria-label="Close chat"
                className="grid size-7 cursor-pointer place-items-center rounded-lg text-faint transition-colors hover:bg-paper hover:text-ink"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden><path d="M6 6l12 12M18 6 6 18" /></svg>
              </button>
            </div>
          </div>

          {/* Body */}
          {active ? (
            <div className="flex min-h-0 flex-1 flex-col p-2">
              <ChatThread
                meId={meId}
                otherId={active.profile.id}
                otherName={profileName(active.profile)}
                initial={active.initial}
              />
            </div>
          ) : loadingThread ? (
            <div className="grid flex-1 place-items-center">
              <span className="size-5 animate-spin rounded-full border-2 border-line border-t-ember" />
            </div>
          ) : convos.length === 0 ? (
            <div className="grid flex-1 place-items-center px-6 text-center">
              <p className="text-sm text-muted">
                Add friends to start chatting.{" "}
                <Link href="/app/friends" onClick={close} className="font-medium text-ember hover:text-ink">
                  Find friends →
                </Link>
              </p>
            </div>
          ) : (
            <ul className="flex-1 overflow-y-auto p-1.5">
              {convos.map((c) => (
                <li key={c.profile.id}>
                  <button
                    type="button"
                    onClick={() => void openThread(c)}
                    className="flex w-full cursor-pointer items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition-colors hover:bg-paper"
                  >
                    <Avatar profile={c.profile} size={36} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-ink">
                        {profileName(c.profile)}
                      </span>
                      <span className="block truncate text-xs text-muted">
                        {c.lastBody ? `${c.lastMine ? "You: " : ""}${c.lastBody}` : "Say hi"}
                      </span>
                    </span>
                    {c.unread > 0 && (
                      <span className="grid min-w-5 shrink-0 place-items-center rounded-full bg-ember px-1.5 text-xs font-semibold text-paper-bright">
                        {c.unread}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </>
  );
}
