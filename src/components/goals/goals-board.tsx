"use client";

import { useState } from "react";
import GoalComposer from "./goal-composer";
import GoalCard from "./goal-card";
import type { Goal, GoalLog, GoalStatus } from "@/lib/goals";

type Filter = GoalStatus | "all";

const TABS: { id: Filter; label: string }[] = [
  { id: "active", label: "Active" },
  { id: "completed", label: "Completed" },
  { id: "paused", label: "Paused" },
  { id: "abandoned", label: "Abandoned" },
  { id: "all", label: "All" },
];

export default function GoalsBoard({
  goals,
  logsByGoal,
}: {
  goals: Goal[];
  logsByGoal: Record<string, GoalLog[]>;
}) {
  const [filter, setFilter] = useState<Filter>("active");

  const counts: Record<Filter, number> = {
    active: 0,
    completed: 0,
    paused: 0,
    abandoned: 0,
    all: goals.length,
  };
  for (const g of goals) counts[g.status]++;

  const visible = goals.filter((g) => filter === "all" || g.status === filter);

  return (
    <div className="space-y-5">
      <GoalComposer />

      {goals.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {TABS.map((t) => {
            const on = t.id === filter;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setFilter(t.id)}
                aria-pressed={on}
                className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors ${
                  on
                    ? "border-ember bg-ember/10 text-ink"
                    : "border-line bg-paper-bright text-ink-soft hover:border-ember/50"
                }`}
              >
                {t.label}
                <span className={on ? "text-ember" : "text-faint"}>{counts[t.id]}</span>
              </button>
            );
          })}
        </div>
      )}

      {visible.length === 0 ? (
        <div className="rounded-2xl border border-line bg-card px-6 py-12 text-center">
          <p className="font-display text-xl text-ink">
            {goals.length === 0 ? "No goals yet" : "Nothing here"}
          </p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted">
            {goals.length === 0
              ? "Set your first goal above. Add the reason behind it — that's what keeps you coming back."
              : "No goals with this status. Try another tab."}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {visible.map((g) => (
            <GoalCard key={g.id} goal={g} logs={logsByGoal[g.id] ?? []} />
          ))}
        </div>
      )}
    </div>
  );
}
