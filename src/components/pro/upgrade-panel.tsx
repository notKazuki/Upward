"use client";

import { useState } from "react";
import { PRO, ANNUAL_PER_MONTH, ANNUAL_SAVING_PCT, type PlanInterval } from "@/lib/pro";
import UpgradeButton from "./upgrade-button";

// Plan picker: monthly / annual toggle with live price + the CTA.
export default function UpgradePanel() {
  const [interval, setIntervalState] = useState<PlanInterval>("annual");
  const isAnnual = interval === "annual";

  return (
    <div className="u-rise rounded-2xl border border-line bg-card p-6">
      {/* interval toggle */}
      <div className="mx-auto flex w-fit items-center gap-1 rounded-full border border-line bg-paper-bright p-1">
        {(["monthly", "annual"] as PlanInterval[]).map((iv) => (
          <button
            key={iv}
            type="button"
            onClick={() => setIntervalState(iv)}
            className={`cursor-pointer rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              interval === iv ? "bg-ember text-paper" : "text-muted hover:text-ink"
            }`}
          >
            {iv === "monthly" ? "Monthly" : "Annual"}
          </button>
        ))}
      </div>
      {isAnnual && (
        <p className="mt-2 text-center text-xs font-semibold uppercase tracking-[0.1em] text-ember">
          Save {ANNUAL_SAVING_PCT}%
        </p>
      )}

      {/* price */}
      <div className="mt-4 text-center">
        <span className="font-display text-5xl text-ink">
          {PRO.currency}
          {isAnnual ? ANNUAL_PER_MONTH : PRO.monthly}
        </span>
        <span className="text-muted"> / month</span>
        <p className="mt-1 text-sm text-muted">
          {isAnnual ? `Billed ${PRO.currency}${PRO.annual} per year` : "Billed monthly"}
        </p>
      </div>

      <UpgradeButton interval={interval} className="mt-5" label="Get Upward Pro" />
      <p className="mt-3 text-center text-xs text-faint">
        Cancel anytime · Your data is always yours to export.
      </p>
    </div>
  );
}
