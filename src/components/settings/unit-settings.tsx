"use client";

import { useState, useTransition } from "react";
import { updateUnitPref } from "@/app/app/settings/actions";
import type { UnitPref } from "@/lib/onboarding";

const OPTIONS: { id: UnitPref; label: string; hint: string }[] = [
  { id: "metric", label: "Metric", hint: "kilograms · centimetres" },
  { id: "imperial", label: "Imperial", hint: "pounds · inches" },
];

export default function UnitSettings({ current }: { current: UnitPref }) {
  const [pref, setPref] = useState<UnitPref>(current);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  function pick(p: UnitPref) {
    if (p === pref || pending) return;
    setPref(p);
    setSaved(false);
    startTransition(async () => {
      const res = await updateUnitPref(p);
      if (!res.error) setSaved(true);
      else setPref(current);
    });
  }

  return (
    <div className="space-y-2.5">
      <div className="grid gap-2 sm:grid-cols-2">
        {OPTIONS.map((o) => {
          const on = o.id === pref;
          return (
            <button
              key={o.id}
              type="button"
              onClick={() => pick(o.id)}
              aria-pressed={on}
              disabled={pending}
              className={`cursor-pointer rounded-xl border p-4 text-left transition-colors disabled:opacity-70 ${
                on
                  ? "border-ember bg-ember/10"
                  : "border-line bg-paper-bright hover:border-ember/50"
              }`}
            >
              <span className="block text-sm font-medium text-ink">{o.label}</span>
              <span className="mt-0.5 block text-xs text-muted">{o.hint}</span>
            </button>
          );
        })}
      </div>
      <p className="text-xs text-faint" aria-live="polite">
        {saved
          ? "Saved."
          : "Used for weights across the app. Numbers you've already logged aren't converted."}
      </p>
    </div>
  );
}
