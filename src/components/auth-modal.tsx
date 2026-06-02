"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import AuthForm from "./auth-form";

type Mode = "signin" | "signup";

const heading: Record<Mode, { title: string; subtitle: string }> = {
  signin: { title: "Welcome back.", subtitle: "Continue your climb." },
  signup: { title: "Begin.", subtitle: "It's a good day to start." },
};

/**
 * Renders the sign in / sign up flow as an overlay over the current page.
 * Mounted once; opened via the `upward:open-auth` event (see auth-button.tsx).
 */
export default function AuthModal() {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("signin");
  const [mounted, setMounted] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const lastFocused = useRef<HTMLElement | null>(null);

  useEffect(() => setMounted(true), []);

  // Open on event.
  useEffect(() => {
    function onOpen(e: Event) {
      const detail = (e as CustomEvent).detail as { mode?: Mode } | undefined;
      lastFocused.current = document.activeElement as HTMLElement | null;
      setMode(detail?.mode === "signup" ? "signup" : "signin");
      setOpen(true);
    }
    window.addEventListener("upward:open-auth", onOpen);
    return () => window.removeEventListener("upward:open-auth", onOpen);
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    lastFocused.current?.focus?.();
  }, []);

  // Scroll lock, Escape, focus, and a basic focus trap while open.
  useEffect(() => {
    if (!open) return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusTimer = setTimeout(() => {
      dialogRef.current
        ?.querySelector<HTMLElement>("input, button")
        ?.focus();
    }, 20);

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
        return;
      }
      if (e.key !== "Tab" || !dialogRef.current) return;

      const focusables = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener("keydown", onKeyDown);
      clearTimeout(focusTimer);
    };
  }, [open, close]);

  if (!mounted || !open) return null;

  const h = heading[mode];

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-4">
      {/* backdrop */}
      <button
        type="button"
        aria-label="Close"
        tabIndex={-1}
        onClick={close}
        className="u-anim-backdrop absolute inset-0 cursor-default bg-black/50 backdrop-blur-md"
      />

      {/* dialog */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-modal-title"
        className="u-anim-modal relative z-10 my-auto w-full max-w-sm rounded-2xl border border-line bg-card p-6 shadow-[0_30px_80px_-30px_rgba(34,31,26,0.55)] sm:p-7"
      >
        <button
          type="button"
          onClick={close}
          aria-label="Close"
          className="absolute right-4 top-4 grid size-8 cursor-pointer place-items-center rounded-full text-muted transition-colors duration-200 hover:bg-paper hover:text-ink"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            aria-hidden
          >
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        </button>

        <div className="mb-6 text-center">
          <h2
            id="auth-modal-title"
            className="font-display text-[2rem] italic leading-none text-ink"
          >
            {h.title}
          </h2>
          <p className="mt-2 text-sm text-muted">{h.subtitle}</p>
        </div>

        {/* key={mode} resets the form's fields/errors when toggling */}
        <AuthForm key={mode} mode={mode} onSwitchMode={setMode} />
      </div>
    </div>,
    document.body,
  );
}
