"use client";

import { useState } from "react";
import {
  guideForDay,
  isRestDay,
  PROGRESSION_NOTE,
  REP_GUIDANCE,
} from "@/lib/exercise-guide";
import { dayColor, displayDay } from "@/lib/workouts";

export default function DayGuide({ days }: { days: string[] }) {
  const guideDays = days.filter((d) => !isRestDay(d));
  const [active, setActive] = useState(guideDays[0] ?? "");
  const [openHelp, setOpenHelp] = useState(false);

  if (guideDays.length === 0) return null;

  const exercises = guideForDay(active);

  return (
    <div className="space-y-4">
      {/* Day tabs */}
      <div className="flex flex-wrap gap-2">
        {guideDays.map((d) => {
          const on = d === active;
          return (
            <button
              key={d}
              type="button"
              onClick={() => setActive(d)}
              aria-pressed={on}
              className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors ${
                on
                  ? "border-ember bg-ember/10 text-ink"
                  : "border-line bg-paper-bright text-ink-soft hover:border-ember/50"
              }`}
            >
              <span
                className="inline-block size-2 rounded-full"
                style={{ backgroundColor: dayColor(d) }}
              />
              {displayDay(d)}
            </button>
          );
        })}
      </div>

      {/* Exercise list for the active day */}
      <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line">
        {exercises.map((ex, i) => (
          <li
            key={`${active}-${i}`}
            className="flex items-center justify-between gap-4 bg-paper-bright px-4 py-2.5"
          >
            <div className="min-w-0">
              <p className="truncate font-medium text-ink">{ex.name}</p>
              <p className="text-xs text-muted">{ex.target}</p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-sm font-medium text-ink-soft">
                {ex.sets === "—" ? ex.reps : `${ex.sets} × ${ex.reps}`}
              </p>
              {ex.sets !== "—" && (
                <p className="text-[0.7rem] uppercase tracking-wide text-faint">
                  sets × reps
                </p>
              )}
            </div>
          </li>
        ))}
      </ul>

      {/* Rep/set guidance toggle */}
      <div className="rounded-xl border border-line bg-card">
        <button
          type="button"
          onClick={() => setOpenHelp((o) => !o)}
          aria-expanded={openHelp}
          className="flex w-full cursor-pointer items-center justify-between gap-3 px-4 py-3 text-left"
        >
          <span className="text-sm font-medium text-ink-soft">
            How many sets &amp; reps? Pick by your goal
          </span>
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
            className={`shrink-0 text-faint transition-transform duration-200 ${
              openHelp ? "rotate-180" : ""
            }`}
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>
        {openHelp && (
          <div className="space-y-3 border-t border-line px-4 py-3.5">
            <div className="grid gap-2.5 sm:grid-cols-3">
              {REP_GUIDANCE.map((g) => (
                <div
                  key={g.goal}
                  className="rounded-lg border border-line bg-paper-bright p-3"
                >
                  <p className="text-sm font-medium text-ink">{g.goal}</p>
                  <p className="mt-0.5 text-sm text-ember">{g.reps}</p>
                  <p className="text-xs text-faint">{g.rest}</p>
                  <p className="mt-1.5 text-xs leading-relaxed text-muted">
                    {g.note}
                  </p>
                </div>
              ))}
            </div>
            <p className="text-xs leading-relaxed text-muted">
              <span className="font-medium text-ink-soft">Tip — </span>
              {PROGRESSION_NOTE}
            </p>
          </div>
        )}
      </div>

      <p className="text-xs text-faint">
        A starting point, not a prescription. Swap exercises for ones you enjoy
        and can do safely.
      </p>
    </div>
  );
}
