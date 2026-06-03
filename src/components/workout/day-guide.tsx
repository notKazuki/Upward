"use client";

import { useState, useTransition } from "react";
import {
  guideForDay,
  isRestDay,
  PROGRESSION_NOTE,
  REP_GUIDANCE,
  repsForGoal,
  type CustomExercise,
  type TrainingGoal,
} from "@/lib/exercise-guide";
import { dayColor, displayDay } from "@/lib/workouts";
import {
  addCustomExercise,
  deleteCustomExercise,
  updateTrainingGoal,
} from "@/app/app/workout/actions";

const inputCls =
  "rounded-lg border border-line bg-paper-bright px-3 py-2 text-sm text-ink placeholder:text-faint focus:border-ember focus:outline-none";

type Row = {
  id?: string;
  name: string;
  target: string | null;
  sets: string | null;
  reps: string | null;
};

export default function DayGuide({
  days,
  goal,
  customByDay,
}: {
  days: string[];
  goal: TrainingGoal | null;
  customByDay: Record<string, CustomExercise[]>;
}) {
  const guideDays = days.filter((d) => !isRestDay(d));
  const [active, setActive] = useState(guideDays[0] ?? "");
  const [selectedGoal, setSelectedGoal] = useState<TrainingGoal | null>(goal);
  const [showAdd, setShowAdd] = useState(false);
  const [, startTransition] = useTransition();

  if (guideDays.length === 0) return null;

  function pickGoal(g: TrainingGoal) {
    const next = selectedGoal === g ? null : g;
    setSelectedGoal(next);
    startTransition(() => {
      void updateTrainingGoal(next ?? "");
    });
  }

  const goalReps = repsForGoal(selectedGoal);
  const rows: Row[] = [
    ...guideForDay(active).map((e) => ({
      name: e.name,
      target: e.target,
      sets: e.sets,
      reps: e.reps,
    })),
    ...(customByDay[active] ?? []).map((c) => ({
      id: c.id,
      name: c.name,
      target: c.target,
      sets: c.sets,
      reps: c.reps,
    })),
  ];

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
              onClick={() => {
                setActive(d);
                setShowAdd(false);
              }}
              aria-pressed={on}
              className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors ${
                on
                  ? "border-ember bg-ember/10 text-ink"
                  : "border-line bg-paper-bright text-ink-soft hover:border-ember/50"
              }`}
            >
              <span className="inline-block size-2 rounded-full" style={{ backgroundColor: dayColor(d) }} />
              {displayDay(d)}
            </button>
          );
        })}
      </div>

      {/* Goal selector */}
      <div>
        <p className="mb-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-faint">
          Training goal {selectedGoal && <span className="text-ember">· reps tuned below</span>}
        </p>
        <div className="grid gap-2 sm:grid-cols-3">
          {REP_GUIDANCE.map((g) => {
            const on = g.id === selectedGoal;
            return (
              <button
                key={g.id}
                type="button"
                onClick={() => pickGoal(g.id)}
                aria-pressed={on}
                className={`cursor-pointer rounded-xl border p-3 text-left transition-colors ${
                  on ? "border-ember bg-ember/10" : "border-line bg-paper-bright hover:border-ember/50"
                }`}
              >
                <span className="block text-sm font-medium text-ink">{g.goal}</span>
                <span className="mt-0.5 block text-sm text-ember">{g.reps}</span>
                <span className="block text-xs text-faint">{g.rest}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Exercise list */}
      <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line">
        {rows.map((row, i) => {
          const override = goalReps && row.sets !== "—";
          const repsText = override ? goalReps : row.reps;
          const setsText = row.sets && row.sets !== "—" ? row.sets : null;
          return (
            <li
              key={row.id ?? `${active}-${i}`}
              className="flex items-center justify-between gap-3 bg-paper-bright px-4 py-2.5"
            >
              <div className="min-w-0">
                <p className="truncate font-medium text-ink">
                  {row.name}
                  {row.id && (
                    <span className="ml-2 rounded-full bg-line px-1.5 py-0.5 text-[0.6rem] font-semibold uppercase tracking-wide text-muted">
                      yours
                    </span>
                  )}
                </p>
                {row.target && <p className="text-xs text-muted">{row.target}</p>}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <div className="text-right">
                  <p className="text-sm font-medium text-ink-soft">
                    {setsText ? `${setsText} × ${repsText}` : repsText || "—"}
                  </p>
                  {setsText && (
                    <p className="text-[0.7rem] uppercase tracking-wide text-faint">sets × reps</p>
                  )}
                </div>
                {row.id && (
                  <button
                    type="button"
                    aria-label={`Remove ${row.name}`}
                    onClick={() =>
                      startTransition(() => {
                        void deleteCustomExercise(row.id as string);
                      })
                    }
                    className="grid size-7 cursor-pointer place-items-center rounded-lg text-faint transition-colors hover:bg-card hover:text-danger"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><path d="M6 6l12 12M18 6 6 18" /></svg>
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {/* Add custom exercise */}
      {showAdd ? (
        <AddExerciseForm
          day={active}
          onDone={() => setShowAdd(false)}
        />
      ) : (
        <button
          type="button"
          onClick={() => setShowAdd(true)}
          className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-line-strong bg-card/50 py-3 text-sm font-medium text-ink-soft transition-colors hover:border-ember hover:text-ember"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><path d="M12 5v14M5 12h14" /></svg>
          Add your own exercise
        </button>
      )}

      {/* Progression tip */}
      <p className="text-xs leading-relaxed text-muted">
        <span className="font-medium text-ink-soft">Tip — </span>
        {PROGRESSION_NOTE}
      </p>
      <p className="text-xs text-faint">
        A starting point, not a prescription. Swap exercises for ones you enjoy
        and can do safely.
      </p>
    </div>
  );
}

function AddExerciseForm({
  day,
  onDone,
}: {
  day: string;
  onDone: () => void;
}) {
  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [sets, setSets] = useState("");
  const [reps, setReps] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    setError(null);
    startTransition(async () => {
      const res = await addCustomExercise({ day, name, target, sets, reps });
      if (res.error) setError(res.error);
      else onDone();
    });
  }

  return (
    <div className="space-y-3 rounded-xl border border-line bg-card p-4">
      <div className="flex flex-wrap gap-2">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Exercise — e.g. Hip Thrust" className={`${inputCls} flex-1`} autoFocus />
        <input value={target} onChange={(e) => setTarget(e.target.value)} placeholder="Target — e.g. Glutes" className={`${inputCls} w-40`} />
      </div>
      <div className="flex flex-wrap gap-2">
        <input value={sets} onChange={(e) => setSets(e.target.value)} placeholder="Sets — e.g. 3" className={`${inputCls} w-28`} />
        <input value={reps} onChange={(e) => setReps(e.target.value)} placeholder="Reps — e.g. 8–12" className={`${inputCls} w-32`} />
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={submit}
          disabled={pending || !name.trim()}
          className="cursor-pointer rounded-full bg-ink px-5 py-2 text-sm font-medium text-paper-bright transition-colors hover:bg-ink-soft disabled:opacity-60"
        >
          {pending ? "Adding…" : "Add exercise"}
        </button>
        <button type="button" onClick={onDone} className="cursor-pointer text-sm font-medium text-muted transition-colors hover:text-ink">
          Cancel
        </button>
      </div>
    </div>
  );
}
