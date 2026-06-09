"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  listNotifications,
  markAllNotificationsRead,
} from "@/app/app/notifications/actions";
import type { AppNotification } from "@/lib/notify";

const TYPE_DOT: Record<string, string> = {
  achievement: "#c9a23f",
  friend_request: "#5f8aa8",
  friend_accept: "#7c9473",
  announcement: "#bc572f",
};

function timeAgo(iso: string): string {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "now";
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}

export default function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<AppNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  async function refresh() {
    const res = await listNotifications();
    setItems(res.items);
    setUnread(res.unread);
  }

  // Initial load + light polling while the tab is visible.
  useEffect(() => {
    void refresh();
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, 60_000);
    const onFocus = () => void refresh();
    window.addEventListener("focus", onFocus);
    return () => {
      window.clearInterval(id);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  // Close on outside click / escape.
  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function toggle() {
    const next = !open;
    setOpen(next);
    if (next && unread > 0) {
      // Mark read once seen; badge clears optimistically.
      setUnread(0);
      void markAllNotificationsRead();
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={toggle}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"}
        className="relative grid size-9 cursor-pointer place-items-center rounded-lg text-ink-soft transition-colors hover:bg-card"
      >
        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.7 21a2 2 0 0 1-3.4 0" />
        </svg>
        {unread > 0 && (
          <span className="absolute right-1 top-1 grid min-w-4 place-items-center rounded-full bg-ember px-1 text-[0.6rem] font-semibold leading-4 text-paper-bright">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="u-anim-menu absolute right-0 z-40 mt-2 w-80 overflow-hidden rounded-xl border border-line bg-card shadow-[0_18px_50px_-24px_rgba(34,31,26,0.45)]">
          <div className="border-b border-line px-4 py-2.5">
            <p className="text-sm font-medium text-ink">Notifications</p>
          </div>
          {items.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted">
              Nothing yet — achievements and friend activity land here.
            </p>
          ) : (
            <ul className="max-h-96 overflow-y-auto p-1.5">
              {items.map((n) => {
                const inner = (
                  <span className="flex w-full items-start gap-2.5">
                    <span
                      className="mt-1.5 inline-block size-2 shrink-0 rounded-full"
                      style={{ backgroundColor: TYPE_DOT[n.type] ?? "var(--color-line)" }}
                    />
                    <span className="min-w-0 flex-1">
                      <span className={`block truncate text-sm ${n.read_at ? "text-ink-soft" : "font-medium text-ink"}`}>
                        {n.title}
                      </span>
                      {n.body && (
                        <span className="block truncate text-xs text-muted">{n.body}</span>
                      )}
                    </span>
                    <span className="shrink-0 text-[0.7rem] text-faint">{timeAgo(n.created_at)}</span>
                  </span>
                );
                return (
                  <li key={n.id}>
                    {n.href ? (
                      <Link
                        href={n.href}
                        onClick={() => setOpen(false)}
                        className="block rounded-lg px-2.5 py-2 transition-colors hover:bg-paper"
                      >
                        {inner}
                      </Link>
                    ) : (
                      <span className="block rounded-lg px-2.5 py-2">{inner}</span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
