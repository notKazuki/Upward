"use client";

import { useState, useTransition } from "react";
import { updateGoals } from "@/app/app/gaming/actions";
import { pct, type GameGoals } from "@/lib/gaming";

type Totals = { matches: number; wins: number; hours: number };

const METRICS: { key: "matches" | "wins" | "hours"; label: string }[] = [
  { key: "matches", label: "Matches" },
  { key: "wins", label: "Wins" },
  { key: "hours", label: "Hours" },
];

export default function GoalsEditor({
  gameId,
  goals,
  today,
  week,
}: {
  gameId: string;
  goals: GameGoals;
  today: Totals;
  week: Totals;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<GameGoals>(goals);
  const [pending, startTransition] = useTransition();

  const hasAny =
    METRICS.some((m) => goals.weekly?.[m.key]) ||
    METRICS.some((m) => goals.daily?.[m.key]);

  function setField(
    period: "daily" | "weekly",
    key: "matches" | "wins" | "hours",
    value: string,
  ) {
    const n = value === "" ? undefined : Math.max(0, Number(value));
    setDraft((d) => ({
      ...d,
      [period]: { ...d[period], [key]: Number.isFinite(n!) ? n : undefined },
    }));
  }

  function save() {
    startTransition(async () => {
      await updateGoals({ gameId, goals: draft });
      setEditing(false);
    });
  }

  if (editing) {
    return (
      <div className="space-y-5">
        {(["weekly", "daily"] as const).map((period) => (
          <div key={period}>
            <p className="mb-2 text-sm font-medium capitalize text-ink-soft">
              {period} targets
            </p>
            <div className="grid grid-cols-3 gap-3">
              {METRICS.map((m) => (
                <label key={m.key} className="flex flex-col gap-1">
                  <span className="text-xs text-muted">{m.label}</span>
                  <input
                    type="number"
                    min={0}
                    step={m.key === "hours" ? "0.5" : "1"}
                    value={draft[period]?.[m.key] ?? ""}
                    onChange={(e) => setField(period, m.key, e.target.value)}
                    placeholder="—"
                    className="rounded-lg border border-line bg-paper-bright px-3 py-2 text-sm text-ink placeholder:text-faint focus:border-ember focus:outline-none"
                  />
                </label>
              ))}
            </div>
          </div>
        ))}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={save}
            disabled={pending}
            className="cursor-pointer rounded-full bg-ink px-5 py-2 text-sm font-medium text-paper-bright transition-colors hover:bg-ink-soft disabled:opacity-70"
          >
            {pending ? "Saving…" : "Save goals"}
          </button>
          <button
            type="button"
            onClick={() => {
              setDraft(goals);
              setEditing(false);
            }}
            className="cursor-pointer text-sm font-medium text-muted transition-colors hover:text-ink"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      {!hasAny ? (
        <p className="text-sm text-muted">
          No goals yet. Set daily or weekly targets to track your progress.
        </p>
      ) : (
        <div className="space-y-5">
          {(["weekly", "daily"] as const).map((period) => {
            const set = goals[period];
            if (!set || !METRICS.some((m) => set[m.key])) return null;
            const totals = period === "weekly" ? week : today;
            return (
              <div key={period}>
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-faint">
                  {period}
                </p>
                <div className="space-y-3">
                  {METRICS.filter((m) => set[m.key]).map((m) => {
                    const target = set[m.key]!;
                    const value =
                      m.key === "hours" ? totals.hours : totals[m.key];
                    const p = pct(value, target);
                    return (
                      <div key={m.key}>
                        <div className="mb-1 flex justify-between text-sm">
                          <span className="text-ink-soft">{m.label}</span>
                          <span className="text-muted">
                            {m.key === "hours"
                              ? `${value.toFixed(1)} / ${target}h`
                              : `${value} / ${target}`}
                          </span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-line">
                          <div
                            className="h-full rounded-full bg-ember transition-[width] duration-500"
                            style={{ width: `${p}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <button
        type="button"
        onClick={() => {
          setDraft(goals);
          setEditing(true);
        }}
        className="mt-4 cursor-pointer text-sm font-medium text-ember transition-colors hover:text-ink"
      >
        {hasAny ? "Edit goals" : "Set goals"}
      </button>
    </div>
  );
}
