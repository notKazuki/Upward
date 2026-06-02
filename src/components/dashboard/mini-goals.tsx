"use client";

import { useState } from "react";
import { sampleGoals } from "@/lib/sample-data";

export default function MiniGoals() {
  const [goals, setGoals] = useState(sampleGoals);

  function toggle(id: string) {
    setGoals((gs) =>
      gs.map((g) => (g.id === id ? { ...g, done: !g.done } : g)),
    );
  }

  const done = goals.filter((g) => g.done).length;

  return (
    <div className="flex h-full flex-col">
      <p className="mb-3 text-sm text-muted">
        <span className="font-semibold text-ink">{done}</span> of {goals.length}{" "}
        done this week
      </p>

      <ul className="flex-1 space-y-1">
        {goals.map((g) => (
          <li key={g.id}>
            <label className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-paper">
              <input
                type="checkbox"
                checked={g.done}
                onChange={() => toggle(g.id)}
                className="peer sr-only"
              />
              <span className="grid size-5 shrink-0 place-items-center rounded-md border border-line-strong text-paper-bright transition-colors peer-checked:border-ember peer-checked:bg-ember">
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <path d="M5 12l5 5 9-11" />
                </svg>
              </span>
              <span
                className={`text-sm transition-colors ${
                  g.done
                    ? "text-faint line-through"
                    : "text-ink-soft"
                }`}
              >
                {g.label}
              </span>
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
}
