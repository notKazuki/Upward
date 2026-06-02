"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { SPLIT_PRESETS } from "@/lib/workouts";
import { saveWorkoutSplit } from "@/app/app/workout/actions";

export default function SplitChooser({
  current,
}: {
  current?: { id: string; days: string[] } | null;
}) {
  const [selected, setSelected] = useState<string>(current?.id ?? "");
  const [customName, setCustomName] = useState("");
  const [customDays, setCustomDays] = useState<string[]>(
    current?.id === "custom" && current.days.length
      ? current.days
      : ["", "", ""],
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function updateDay(i: number, v: string) {
    setCustomDays((d) => d.map((x, idx) => (idx === i ? v : x)));
  }

  function save() {
    setError(null);
    let splitId = selected;
    let name = "";
    let days: string[] = [];

    if (selected === "custom") {
      days = customDays.map((d) => d.trim()).filter(Boolean);
      name = customName.trim() || "My Split";
      if (days.length === 0) {
        setError("Add at least one day to your split.");
        return;
      }
    } else {
      const preset = SPLIT_PRESETS.find((s) => s.id === selected);
      if (!preset) {
        setError("Choose a split to continue.");
        return;
      }
      splitId = preset.id;
      name = preset.name;
      days = preset.days;
    }

    startTransition(async () => {
      const res = await saveWorkoutSplit({ splitId, name, days });
      if (res?.error) setError(res.error);
    });
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <h1 className="font-display text-[2rem] font-normal tracking-tight text-ink">
          Choose your split
        </h1>
        <p className="mt-1 text-sm text-muted">
          How do you like to train? This shapes how you log workouts — you can
          change it anytime.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {SPLIT_PRESETS.map((s) => {
          const active = selected === s.id;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => setSelected(s.id)}
              aria-pressed={active}
              className={`cursor-pointer rounded-2xl border p-4 text-left transition-colors duration-200 ${
                active
                  ? "border-ember bg-ember-wash"
                  : "border-line bg-card hover:border-line-strong"
              }`}
            >
              <span className="font-display text-lg text-ink">{s.name}</span>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {s.days.map((d) => (
                  <span
                    key={d}
                    className="rounded-full bg-paper-bright px-2.5 py-0.5 text-xs font-medium text-ink-soft"
                  >
                    {d}
                  </span>
                ))}
              </div>
            </button>
          );
        })}

        {/* Custom */}
        <button
          type="button"
          onClick={() => setSelected("custom")}
          aria-pressed={selected === "custom"}
          className={`cursor-pointer rounded-2xl border p-4 text-left transition-colors duration-200 sm:col-span-2 ${
            selected === "custom"
              ? "border-ember bg-ember-wash"
              : "border-line bg-card hover:border-line-strong"
          }`}
        >
          <span className="font-display text-lg text-ink">Build your own</span>
          <p className="mt-0.5 text-sm text-muted">
            Name your split and define exactly the days you train.
          </p>
        </button>
      </div>

      {selected === "custom" && (
        <div className="mt-4 rounded-2xl border border-line bg-card p-5">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-ink-soft">Split name</span>
            <input
              type="text"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder="e.g. My PPL+Arms"
              className="rounded-xl border border-line bg-paper-bright px-4 py-2.5 text-[0.95rem] text-ink placeholder:text-faint transition-colors focus:border-ember focus:outline-none"
            />
          </label>

          <p className="mb-2 mt-4 text-sm font-medium text-ink-soft">Days</p>
          <div className="flex flex-col gap-2">
            {customDays.map((d, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  type="text"
                  value={d}
                  onChange={(e) => updateDay(i, e.target.value)}
                  placeholder={`Day ${i + 1} — e.g. Push`}
                  className="flex-1 rounded-xl border border-line bg-paper-bright px-4 py-2.5 text-[0.95rem] text-ink placeholder:text-faint transition-colors focus:border-ember focus:outline-none"
                />
                {customDays.length > 1 && (
                  <button
                    type="button"
                    onClick={() =>
                      setCustomDays((days) => days.filter((_, idx) => idx !== i))
                    }
                    aria-label={`Remove day ${i + 1}`}
                    className="grid size-9 shrink-0 cursor-pointer place-items-center rounded-lg text-faint transition-colors hover:bg-paper hover:text-danger"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><path d="M6 6l12 12M18 6 6 18" /></svg>
                  </button>
                )}
              </div>
            ))}
          </div>
          {customDays.length < 12 && (
            <button
              type="button"
              onClick={() => setCustomDays((d) => [...d, ""])}
              className="mt-2 cursor-pointer text-sm font-medium text-ember transition-colors hover:text-ink"
            >
              + Add a day
            </button>
          )}
        </div>
      )}

      {error && (
        <p role="alert" className="mt-4 text-sm text-danger">
          {error}
        </p>
      )}

      <div className="mt-6 flex items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={pending || !selected}
          className="inline-flex cursor-pointer items-center justify-center rounded-full bg-ink px-6 py-2.5 text-sm font-medium text-paper-bright shadow-[0_2px_8px_rgba(34,31,26,0.16)] transition-all duration-200 hover:bg-ink-soft disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save split"}
        </button>
        {current && (
          <Link
            href="/app/workout"
            className="text-sm font-medium text-muted transition-colors hover:text-ink"
          >
            Cancel
          </Link>
        )}
      </div>
    </div>
  );
}
