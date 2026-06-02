"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Phase = "loading" | "off" | "enrolling" | "on";

export default function TwoFactor() {
  const [phase, setPhase] = useState<Phase>("loading");
  const [qr, setQr] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    supabase.auth.mfa.listFactors().then(({ data, error }) => {
      if (error) {
        setPhase("off");
        return;
      }
      setPhase((data?.totp ?? []).length > 0 ? "on" : "off");
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function startEnroll() {
    setBusy(true);
    setError(null);
    // Clear any abandoned unverified factors first.
    const { data: list } = await supabase.auth.mfa.listFactors();
    for (const f of list?.all ?? []) {
      if (f.factor_type === "totp" && f.status === "unverified")
        await supabase.auth.mfa.unenroll({ factorId: f.id });
    }
    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: "totp",
    });
    setBusy(false);
    if (error || !data) {
      setError(error?.message ?? "Couldn't start setup.");
      return;
    }
    setFactorId(data.id);
    setQr(data.totp.qr_code);
    setSecret(data.totp.secret);
    setCode("");
    setPhase("enrolling");
  }

  async function verify() {
    if (!factorId) return;
    setBusy(true);
    setError(null);
    const { data: ch, error: chErr } = await supabase.auth.mfa.challenge({
      factorId,
    });
    if (chErr || !ch) {
      setBusy(false);
      setError("Couldn't verify right now. Try again.");
      return;
    }
    const { error: vErr } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: ch.id,
      code: code.trim(),
    });
    setBusy(false);
    if (vErr) {
      setError("That code didn't match. Check your app and try again.");
      return;
    }
    setQr(null);
    setSecret(null);
    setFactorId(null);
    setCode("");
    setPhase("on");
  }

  async function cancel() {
    if (factorId) await supabase.auth.mfa.unenroll({ factorId });
    setQr(null);
    setSecret(null);
    setFactorId(null);
    setCode("");
    setError(null);
    setPhase("off");
  }

  async function disable() {
    setBusy(true);
    setError(null);
    const { data } = await supabase.auth.mfa.listFactors();
    const verified = (data?.totp ?? [])[0];
    if (verified) {
      const { error } = await supabase.auth.mfa.unenroll({
        factorId: verified.id,
      });
      if (error) {
        setBusy(false);
        setError("Couldn't disable — you may need to sign in again first.");
        return;
      }
    }
    setBusy(false);
    setPhase("off");
  }

  if (phase === "loading") {
    return <p className="text-sm text-muted">Checking…</p>;
  }

  if (phase === "on") {
    return (
      <div className="flex items-center justify-between gap-4">
        <p className="flex items-center gap-2 text-sm text-ink-soft">
          <span className="grid size-6 place-items-center rounded-full bg-ember-wash text-ember">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M5 12l5 5 9-11" /></svg>
          </span>
          Two-factor authentication is <span className="font-medium text-ink">on</span>.
        </p>
        <button
          type="button"
          onClick={disable}
          disabled={busy}
          className="cursor-pointer rounded-xl border border-line px-4 py-2 text-sm font-medium text-danger transition-colors hover:bg-paper disabled:opacity-60"
        >
          {busy ? "…" : "Disable"}
        </button>
      </div>
    );
  }

  if (phase === "enrolling") {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-sm leading-relaxed text-muted">
          Scan this with an authenticator app (Google Authenticator, Authy, 1Password…),
          then enter the 6-digit code it shows.
        </p>
        <div className="flex flex-wrap items-center gap-5">
          {qr && (
            <div className="rounded-xl bg-white p-3">
              {/* Supabase returns qr_code as an SVG data-URI — render as an image. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qr}
                alt="Authenticator QR code"
                width={160}
                height={160}
                className="block size-40"
              />
            </div>
          )}
          {secret && (
            <div className="text-sm">
              <p className="text-muted">Or enter this key manually:</p>
              <code className="mt-1 block break-all rounded-lg bg-paper-bright px-3 py-2 font-mono text-xs text-ink">
                {secret}
              </code>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            inputMode="numeric"
            placeholder="123456"
            aria-label="6-digit code"
            className="w-32 rounded-xl border border-line bg-paper-bright px-4 py-2.5 text-center font-mono tracking-widest text-ink placeholder:text-faint focus:border-ember focus:outline-none"
          />
          <button
            type="button"
            onClick={verify}
            disabled={busy || code.length !== 6}
            className="cursor-pointer rounded-xl bg-ink px-5 py-2.5 text-sm font-medium text-paper-bright transition-colors hover:bg-ink-soft disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? "Verifying…" : "Verify & enable"}
          </button>
          <button
            type="button"
            onClick={cancel}
            className="cursor-pointer px-3 py-2.5 text-sm font-medium text-muted transition-colors hover:text-ink"
          >
            Cancel
          </button>
        </div>
        {error && <p className="text-sm text-danger">{error}</p>}
      </div>
    );
  }

  // off
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm leading-relaxed text-muted">
        Add a second step at sign-in using an authenticator app. Free and works
        offline — the strongest option.
      </p>
      <button
        type="button"
        onClick={startEnroll}
        disabled={busy}
        className="w-fit cursor-pointer rounded-xl bg-ink px-5 py-2.5 text-sm font-medium text-paper-bright transition-colors hover:bg-ink-soft disabled:opacity-60"
      >
        {busy ? "…" : "Enable 2FA"}
      </button>
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}
