"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function MfaChallenge() {
  const router = useRouter();
  const [phase, setPhase] = useState<"checking" | "ready">("checking");
  const [factorId, setFactorId] = useState<string | null>(null);
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function goNext() {
    const next =
      new URLSearchParams(window.location.search).get("next") || "/app";
    router.replace(next);
    router.refresh();
  }

  useEffect(() => {
    const supabase = createClient();
    (async () => {
      const { data: aal } =
        await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      // Already elevated, or no second factor required → move on.
      if (!aal || aal.nextLevel !== "aal2" || aal.currentLevel === "aal2") {
        goNext();
        return;
      }
      const { data: factors } = await supabase.auth.mfa.listFactors();
      const totp = factors?.totp?.[0];
      if (!totp) {
        goNext();
        return;
      }
      setFactorId(totp.id);
      const { data: ch, error: chErr } = await supabase.auth.mfa.challenge({
        factorId: totp.id,
      });
      if (chErr || !ch) {
        setError("Couldn't start the check. Try refreshing.");
      } else {
        setChallengeId(ch.id);
      }
      setPhase("ready");
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function verify() {
    if (!factorId || !challengeId) return;
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { error: vErr } = await supabase.auth.mfa.verify({
      factorId,
      challengeId,
      code: code.trim(),
    });
    if (vErr) {
      setBusy(false);
      setError("That code didn't match. Check your app and try again.");
      // Issue a fresh challenge for the next attempt.
      const { data: ch } = await supabase.auth.mfa.challenge({ factorId });
      if (ch) setChallengeId(ch.id);
      setCode("");
      return;
    }
    goNext();
  }

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/");
    router.refresh();
  }

  if (phase === "checking") {
    return <p className="py-6 text-center text-sm text-muted">One moment…</p>;
  }

  return (
    <div className="flex flex-col gap-5">
      <p className="text-sm leading-relaxed text-muted">
        Enter the 6-digit code from your authenticator app to finish signing in.
      </p>
      <input
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
        onKeyDown={(e) => {
          if (e.key === "Enter" && code.length === 6) verify();
        }}
        inputMode="numeric"
        autoFocus
        aria-label="6-digit code"
        placeholder="123456"
        className="w-full rounded-xl border border-line bg-paper-bright px-4 py-3 text-center font-mono text-lg tracking-[0.4em] text-ink placeholder:text-faint focus:border-ember focus:outline-none"
      />
      {error && <p className="text-sm text-danger">{error}</p>}
      <button
        type="button"
        onClick={verify}
        disabled={busy || code.length !== 6}
        className="cursor-pointer rounded-xl bg-ink px-5 py-3.5 text-sm font-medium text-paper-bright transition-colors hover:bg-ink-soft disabled:cursor-not-allowed disabled:opacity-60"
      >
        {busy ? "Verifying…" : "Verify"}
      </button>
      <button
        type="button"
        onClick={signOut}
        className="cursor-pointer text-center text-sm font-medium text-muted transition-colors hover:text-ink"
      >
        Sign in with a different account
      </button>
    </div>
  );
}
