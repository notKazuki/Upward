"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Watches the deployed version and, when it changes, invites the user to
 * refresh — instead of the app hard-reloading under them. Captures the version
 * at load, then re-checks every minute and whenever the tab regains focus.
 * In dev the version is constant ("dev"), so this never fires.
 */
export default function UpdateNotice() {
  const loaded = useRef<string | null>(null);
  const [show, setShow] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let active = true;

    async function check() {
      try {
        const res = await fetch("/api/version", { cache: "no-store" });
        if (!res.ok || !active) return;
        const data = (await res.json()) as { version?: string };
        const v = data?.version;
        if (!v || !active) return;
        if (loaded.current === null) {
          loaded.current = v; // baseline: the version this tab loaded under
          return;
        }
        if (v !== loaded.current) setShow(true);
      } catch {
        /* network hiccup — try again next tick */
      }
    }

    check();
    const id = window.setInterval(check, 60_000);
    const onVisible = () => document.visibilityState === "visible" && check();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", check);
    return () => {
      active = false;
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", check);
    };
  }, []);

  if (!show || dismissed) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="motion-safe:animate-[updnotice_240ms_ease-out] fixed inset-x-4 bottom-4 z-50 mx-auto max-w-sm rounded-2xl border border-line bg-card p-4 shadow-[0_18px_50px_-20px_rgba(0,0,0,0.5)] sm:left-auto sm:right-4 sm:mx-0"
    >
      <style>{`@keyframes updnotice{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}`}</style>
      <div className="flex items-start gap-3">
        <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full bg-ember/15 text-ember">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M21 12a9 9 0 1 1-2.64-6.36M21 3v6h-6" />
          </svg>
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-ink">A new version of Upward is ready</p>
          <p className="mt-0.5 text-xs leading-relaxed text-muted">
            Refresh to get the latest — your work is saved.
          </p>
          <div className="mt-3 flex items-center gap-3">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="cursor-pointer rounded-full bg-ink px-4 py-1.5 text-sm font-medium text-paper-bright transition-colors hover:bg-ink-soft"
            >
              Refresh now
            </button>
            <button
              type="button"
              onClick={() => setDismissed(true)}
              className="cursor-pointer text-sm font-medium text-muted transition-colors hover:text-ink"
            >
              Later
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label="Dismiss"
          className="grid size-6 shrink-0 cursor-pointer place-items-center rounded-md text-faint transition-colors hover:text-ink"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden><path d="M6 6l12 12M18 6 6 18" /></svg>
        </button>
      </div>
    </div>
  );
}
