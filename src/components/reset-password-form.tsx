"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export default function ResetPasswordForm() {
  const router = useRouter();
  const [ready, setReady] = useState<"checking" | "ready" | "invalid">(
    "checking",
  );
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "pending" | "done">("idle");

  // The recovery link (via /auth/confirm) establishes a session; verify it.
  useEffect(() => {
    if (!isSupabaseConfigured) {
      setReady("invalid");
      return;
    }
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setReady(data.user ? "ready" : "invalid");
    });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("Use at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    setStatus("pending");
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setError(updateError.message);
      setStatus("idle");
      return;
    }
    setStatus("done");
    setTimeout(() => {
      router.push("/app");
      router.refresh();
    }, 1200);
  }

  if (ready === "checking") {
    return (
      <p className="py-6 text-center text-sm text-muted">Verifying your link…</p>
    );
  }

  if (ready === "invalid") {
    return (
      <div className="flex flex-col items-center gap-3 py-2 text-center">
        <h2 className="font-display text-2xl text-ink">Link expired</h2>
        <p className="max-w-xs text-sm leading-relaxed text-muted">
          This password reset link is invalid or has expired. Request a fresh one
          from the sign-in screen.
        </p>
        <Link
          href="/signin"
          className="mt-2 text-sm font-medium text-ink underline decoration-line-strong underline-offset-2 transition-colors hover:text-ember hover:decoration-ember"
        >
          Back to sign in
        </Link>
      </div>
    );
  }

  if (status === "done") {
    return (
      <p className="py-6 text-center text-sm text-ink-soft">
        Password updated. Taking you in…
      </p>
    );
  }

  return (
    <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <div className="flex items-baseline justify-between">
          <label htmlFor="new-password" className="text-sm font-medium text-ink-soft">
            New password
          </label>
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            className="cursor-pointer text-xs font-medium text-muted transition-colors hover:text-ink"
          >
            {show ? "Hide" : "Show"}
          </button>
        </div>
        <input
          id="new-password"
          type={show ? "text" : "password"}
          autoComplete="new-password"
          placeholder="At least 8 characters"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-xl border border-line bg-paper-bright px-4 py-3 text-[0.95rem] text-ink placeholder:text-faint transition-colors focus:border-ember focus:outline-none"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="confirm-password" className="text-sm font-medium text-ink-soft">
          Confirm password
        </label>
        <input
          id="confirm-password"
          type={show ? "text" : "password"}
          autoComplete="new-password"
          placeholder="Re-enter your password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className="w-full rounded-xl border border-line bg-paper-bright px-4 py-3 text-[0.95rem] text-ink placeholder:text-faint transition-colors focus:border-ember focus:outline-none"
        />
      </div>

      {error && (
        <p role="alert" className="rounded-xl border border-danger/40 bg-danger/5 px-4 py-3 text-center text-sm text-danger">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={status === "pending"}
        className="cursor-pointer rounded-xl bg-ink px-5 py-3.5 text-sm font-medium text-paper-bright shadow-[0_2px_8px_rgba(34,31,26,0.16)] transition-all duration-200 hover:bg-ink-soft disabled:cursor-not-allowed disabled:opacity-70"
      >
        {status === "pending" ? "Updating…" : "Update password"}
      </button>
    </form>
  );
}
