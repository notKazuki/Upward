"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import changelog from "@/data/changelog.json";

type Entry = { date: string; title: string; items: string[] };
const ENTRIES = changelog as Entry[];
const LATEST = ENTRIES[0]?.date ?? "";

function formatDate(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function Changelog() {
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      setUnread(localStorage.getItem("changelog_seen") !== LATEST);
    } catch {
      setUnread(false);
    }
  }, []);

  function openLog() {
    setOpen(true);
    setUnread(false);
    try {
      localStorage.setItem("changelog_seen", LATEST);
    } catch {}
  }

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={openLog}
        aria-label="What's new"
        title="What's new"
        className="relative grid size-9 cursor-pointer place-items-center rounded-full text-ink-soft transition-colors hover:bg-card"
      >
        <svg
          width="20" height="20" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"
          strokeLinejoin="round" aria-hidden
        >
          <path d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8z" />
          <path d="M19 14l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z" />
        </svg>
        {mounted && unread && (
          <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-ember ring-2 ring-paper" />
        )}
      </button>

      {mounted &&
        open &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:items-center">
            <button
              type="button"
              aria-label="Close"
              tabIndex={-1}
              onClick={() => setOpen(false)}
              className="absolute inset-0 cursor-default bg-black/50 backdrop-blur-md"
            />
            <div
              role="dialog"
              aria-modal="true"
              aria-label="What's new"
              className="u-anim-modal relative z-10 my-auto flex max-h-[80vh] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-line bg-card shadow-[0_30px_80px_-30px_rgba(0,0,0,0.55)]"
            >
              <div className="flex items-center justify-between border-b border-line px-5 py-4">
                <h2 className="font-display text-xl text-ink">What's new</h2>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Close"
                  className="grid size-8 cursor-pointer place-items-center rounded-full text-muted transition-colors hover:bg-paper hover:text-ink"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><path d="M6 6l12 12M18 6 6 18" /></svg>
                </button>
              </div>

              <ul className="space-y-6 overflow-y-auto px-5 py-5">
                {ENTRIES.map((e, i) => (
                  <li key={i}>
                    <div className="mb-2 flex items-baseline gap-2.5">
                      <span className="font-display text-base text-ink">
                        {e.title}
                      </span>
                      {i === 0 && (
                        <span className="rounded-full bg-ember-wash px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide text-ember">
                          New
                        </span>
                      )}
                      <span className="ml-auto text-xs text-faint">
                        {formatDate(e.date)}
                      </span>
                    </div>
                    <ul className="space-y-1.5">
                      {e.items.map((it, j) => (
                        <li
                          key={j}
                          className="flex gap-2.5 text-sm leading-relaxed text-muted"
                        >
                          <span className="mt-2 size-1.5 shrink-0 rounded-full bg-ember-soft" />
                          {it}
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
