"use client";

import { useState } from "react";
import Icon from "@/components/icons";
import type { PlanInterval } from "@/lib/pro";

// The Pro CTA. Posts to /api/checkout: a live Stripe session redirects; the
// dormant scaffold returns a friendly "launching soon" message shown inline.
export default function UpgradeButton({
  interval = "monthly",
  label = "Get Upward Pro",
  className = "",
}: {
  interval?: PlanInterval;
  label?: string;
  className?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function go() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ interval }),
      });
      const data = (await res.json().catch(() => null)) as { url?: string; error?: string } | null;
      if (res.ok && data?.url) {
        window.location.href = data.url;
        return;
      }
      setMsg(data?.error ?? "Something went wrong. Please try again.");
    } catch {
      setMsg("Couldn't reach checkout. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={className}>
      <button
        type="button"
        onClick={go}
        disabled={busy}
        className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-ember px-6 py-3 text-sm font-semibold text-paper transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <Icon name="sparkle" size={16} />
        {busy ? "One moment…" : label}
      </button>
      {msg && <p className="mt-2.5 text-center text-sm text-muted">{msg}</p>}
    </div>
  );
}
