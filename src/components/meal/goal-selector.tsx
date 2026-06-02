"use client";

import { useTransition } from "react";
import { updateGoal } from "@/app/app/meal/actions";
import { GOALS, type Goal } from "@/lib/nutrition";

export default function GoalSelector({ goal }: { goal: Goal }) {
  const [pending, startTransition] = useTransition();

  function pick(next: Goal) {
    if (next === goal || pending) return;
    startTransition(async () => {
      await updateGoal(next);
    });
  }

  const active = GOALS.find((g) => g.id === goal) ?? GOALS[1];

  return (
    <div className="space-y-3">
      <div
        role="radiogroup"
        aria-label="Weight goal"
        className="grid gap-2 sm:grid-cols-3"
      >
        {GOALS.map((g) => {
          const selected = g.id === goal;
          return (
            <button
              key={g.id}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => pick(g.id)}
              disabled={pending}
              className={`cursor-pointer rounded-xl border px-4 py-3 text-left transition-colors disabled:opacity-70 ${
                selected
                  ? "border-ember bg-ember/10 text-ink"
                  : "border-line bg-paper-bright text-ink-soft hover:border-ember/50"
              }`}
            >
              <span className="block text-sm font-medium">{g.label}</span>
              <span className="mt-0.5 block text-xs text-muted">{g.blurb}</span>
            </button>
          );
        })}
      </div>
      <p className="text-xs text-faint">
        Your suggested targets adjust for <b className="text-muted">{active.label.toLowerCase()}</b>.
        {" "}Manual targets, if set, always win.
      </p>
    </div>
  );
}
