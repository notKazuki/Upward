"use client";

import { useState, useTransition } from "react";
import DateField from "@/components/date-field";
import Icon from "@/components/icons";
import { createGoal } from "@/app/app/goals/actions";
import { CATEGORIES, GOAL_TYPES, todayYmd, type GoalType } from "@/lib/goals";

const inputCls =
  "w-full rounded-xl border border-line bg-paper-bright px-4 py-2.5 text-[0.95rem] text-ink placeholder:text-faint transition-colors focus:border-ember focus:outline-none";

export default function GoalComposer() {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [type, setType] = useState<GoalType>("numeric");
  const [target, setTarget] = useState("");
  const [unit, setUnit] = useState("");
  const [category, setCategory] = useState("fitness");
  const [deadline, setDeadline] = useState("");
  const [why, setWhy] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function reset() {
    setTitle("");
    setType("numeric");
    setTarget("");
    setUnit("");
    setCategory("fitness");
    setDeadline("");
    setWhy("");
    setDescription("");
    setError(null);
  }

  function submit() {
    setError(null);
    startTransition(async () => {
      const res = await createGoal({
        title,
        type,
        category,
        target_value: target ? Number(target) : null,
        unit,
        deadline: deadline || null,
        why,
        description,
      });
      if (res.error) setError(res.error);
      else {
        reset();
        setOpen(false);
      }
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-line-strong bg-card/50 py-4 text-sm font-medium text-ink-soft transition-colors hover:border-ember hover:text-ember"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><path d="M12 5v14M5 12h14" /></svg>
        New goal
      </button>
    );
  }

  return (
    <div className="rounded-2xl border border-line bg-card p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-display text-lg text-ink">New goal</h3>
        <button
          type="button"
          onClick={() => {
            reset();
            setOpen(false);
          }}
          aria-label="Close"
          className="grid size-8 cursor-pointer place-items-center rounded-lg text-faint transition-colors hover:bg-paper hover:text-ink"
        >
          <Icon name="close" size={18} />
        </button>
      </div>

      <div className="space-y-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-ink-soft">Goal</span>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Run 100 miles this season"
            className={inputCls}
            autoFocus
          />
        </label>

        {/* Type */}
        <div>
          <p className="mb-1.5 text-sm font-medium text-ink-soft">Type</p>
          <div className="grid gap-2 sm:grid-cols-3">
            {GOAL_TYPES.map((t) => {
              const on = t.id === type;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setType(t.id)}
                  aria-pressed={on}
                  className={`cursor-pointer rounded-xl border px-3 py-2.5 text-left transition-colors ${
                    on
                      ? "border-ember bg-ember/10"
                      : "border-line bg-paper-bright hover:border-ember/50"
                  }`}
                >
                  <span className="block text-sm font-medium text-ink">{t.label}</span>
                  <span className="mt-0.5 block text-xs leading-snug text-muted">{t.hint}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Target */}
        {type !== "binary" && (
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-ink-soft">
                {type === "streak" ? "Target streak (days)" : "Target"}
              </span>
              <input
                type="number"
                min={1}
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                placeholder={type === "streak" ? "30" : "100"}
                className={`${inputCls} w-32`}
              />
            </label>
            {type === "numeric" && (
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-ink-soft">Unit</span>
                <input
                  type="text"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  placeholder="miles, books, $…"
                  className={`${inputCls} w-40`}
                />
              </label>
            )}
          </div>
        )}

        {/* Category */}
        <div>
          <p className="mb-1.5 text-sm font-medium text-ink-soft">Category</p>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => {
              const on = c.id === category;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCategory(c.id)}
                  aria-pressed={on}
                  className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                    on
                      ? "border-ember bg-ember/10 text-ink"
                      : "border-line bg-paper-bright text-ink-soft hover:border-ember/50"
                  }`}
                >
                  <span className="inline-block size-2 rounded-full" style={{ backgroundColor: c.color }} />
                  {c.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Why */}
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-ink-soft">
            Why this matters <span className="font-normal text-faint">(optional, but it helps)</span>
          </span>
          <textarea
            value={why}
            onChange={(e) => setWhy(e.target.value)}
            placeholder="The reason you'll come back to on a hard day…"
            rows={2}
            className={`${inputCls} resize-none`}
          />
        </label>

        {/* Deadline */}
        <div>
          <p className="mb-1.5 text-sm font-medium text-ink-soft">
            Deadline <span className="font-normal text-faint">(optional)</span>
          </p>
          <DateField
            value={deadline}
            onChange={setDeadline}
            min={todayYmd()}
            placeholder="No deadline — ongoing"
          />
        </div>

        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}

        <div className="flex items-center gap-3 pt-1">
          <button
            type="button"
            onClick={submit}
            disabled={pending}
            className="cursor-pointer rounded-full bg-ink px-6 py-2.5 text-sm font-medium text-paper-bright transition-colors hover:bg-ink-soft disabled:opacity-70"
          >
            {pending ? "Creating…" : "Create goal"}
          </button>
          <button
            type="button"
            onClick={() => {
              reset();
              setOpen(false);
            }}
            className="cursor-pointer text-sm font-medium text-muted transition-colors hover:text-ink"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
