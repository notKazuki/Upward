"use client";

import { useState, useTransition } from "react";
import {
  guideForDay,
  isRestDay,
  PROGRESSION_NOTE,
  REP_GUIDANCE,
  repsForGoal,
  searchExercises,
  type CustomExercise,
  type Exercise,
  type TrainingGoal,
} from "@/lib/exercise-guide";
import { dayColor, displayDay } from "@/lib/workouts";
import {
  addCustomExercise,
  deleteCustomExercise,
  updateCustomExercise,
  updateTrainingGoal,
} from "@/app/app/workout/actions";

const inputCls =
  "rounded-lg border border-line bg-paper-bright px-3 py-2 text-sm text-ink placeholder:text-faint focus:border-ember focus:outline-none";

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
  const [pending, startTransition] = useTransition();

  if (guideDays.length === 0) return null;

  function pickGoal(g: TrainingGoal) {
    const next = selectedGoal === g ? null : g;
    setSelectedGoal(next);
    startTransition(() => {
      void updateTrainingGoal(next ?? "");
    });
  }

  const goalReps = repsForGoal(selectedGoal);
  const program = customByDay[active] ?? [];
  const inProgram = new Set(program.map((p) => p.name.toLowerCase()));
  const suggestions = guideForDay(active).filter(
    (s) => !inProgram.has(s.name.toLowerCase()),
  );

  function addSuggestion(ex: Exercise) {
    startTransition(() => {
      void addCustomExercise({
        day: active,
        name: ex.name,
        target: ex.target,
        sets: ex.sets,
        reps: ex.reps,
      });
    });
  }

  return (
    <div className="space-y-5">
      {/* Day tabs */}
      <div className="flex flex-wrap gap-2">
        {guideDays.map((d) => {
          const on = d === active;
          const count = (customByDay[d] ?? []).length;
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
              <span className="inline-block size-2 rounded-full" style={{ backgroundColor: dayColor(d) }} />
              {displayDay(d)}
              {count > 0 && <span className="text-faint">{count}</span>}
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

      {/* Your program for the active day */}
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-faint">
          {displayDay(active)} — your exercises
        </p>
        {program.length === 0 ? (
          <p className="rounded-xl border border-dashed border-line-strong bg-card/40 px-4 py-4 text-sm text-muted">
            No exercises yet for this day. Add your own below, or start from the
            suggested routine.
          </p>
        ) : (
          <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line">
            {program.map((ex) => (
              <ProgramRow key={ex.id} ex={ex} goalReps={goalReps} pending={pending} />
            ))}
          </ul>
        )}
      </div>

      {/* Add exercise */}
      <AddExercise day={active} />

      {/* Suggested exercises to seed/extend the day */}
      {suggestions.length > 0 && (
        <div className="rounded-xl border border-line bg-card p-4">
          <div className="mb-2 flex items-center justify-between gap-3">
            <p className="text-sm font-medium text-ink-soft">
              Suggested for {displayDay(active)}
            </p>
            <button
              type="button"
              onClick={() =>
                startTransition(async () => {
                  for (const s of suggestions) {
                    await addCustomExercise({
                      day: active,
                      name: s.name,
                      target: s.target,
                      sets: s.sets,
                      reps: s.reps,
                    });
                  }
                })
              }
              disabled={pending}
              className="cursor-pointer text-sm font-medium text-ember transition-colors hover:text-ink disabled:opacity-60"
            >
              Add all
            </button>
          </div>
          <ul className="space-y-1.5">
            {suggestions.map((s, i) => (
              <li key={`${s.name}-${i}`} className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <span className="text-sm text-ink">{s.name}</span>
                  <span className="ml-2 text-xs text-faint">{s.target}</span>
                </div>
                <button
                  type="button"
                  onClick={() => addSuggestion(s)}
                  disabled={pending}
                  aria-label={`Add ${s.name}`}
                  className="shrink-0 cursor-pointer rounded-full border border-line px-3 py-1 text-xs font-medium text-ink-soft transition-colors hover:border-ember hover:text-ember disabled:opacity-60"
                >
                  + Add
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Tip */}
      <p className="text-xs leading-relaxed text-muted">
        <span className="font-medium text-ink-soft">Tip — </span>
        {PROGRESSION_NOTE}
      </p>
    </div>
  );
}

function ProgramRow({
  ex,
  goalReps,
  pending,
}: {
  ex: CustomExercise;
  goalReps: string | null;
  pending: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(ex.name);
  const [target, setTarget] = useState(ex.target ?? "");
  const [sets, setSets] = useState(ex.sets ?? "");
  const [reps, setReps] = useState(ex.reps ?? "");
  const [busy, startTransition] = useTransition();

  if (editing) {
    return (
      <li className="space-y-2 bg-paper-bright px-4 py-3">
        <div className="flex flex-wrap gap-2">
          <input value={name} onChange={(e) => setName(e.target.value)} className={`${inputCls} flex-1`} placeholder="Exercise" />
          <input value={target} onChange={(e) => setTarget(e.target.value)} className={`${inputCls} w-36`} placeholder="Target" />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input value={sets} onChange={(e) => setSets(e.target.value)} className={`${inputCls} w-24`} placeholder="Sets" />
          <input value={reps} onChange={(e) => setReps(e.target.value)} className={`${inputCls} w-28`} placeholder="Reps" />
          <button
            type="button"
            disabled={busy || !name.trim()}
            onClick={() =>
              startTransition(async () => {
                const res = await updateCustomExercise(ex.id, { name, target, sets, reps });
                if (!res.error) setEditing(false);
              })
            }
            className="cursor-pointer rounded-full bg-ink px-4 py-1.5 text-sm font-medium text-paper-bright transition-colors hover:bg-ink-soft disabled:opacity-60"
          >
            {busy ? "Saving…" : "Save"}
          </button>
          <button type="button" onClick={() => setEditing(false)} className="cursor-pointer text-sm font-medium text-muted hover:text-ink">
            Cancel
          </button>
        </div>
      </li>
    );
  }

  const override = goalReps && ex.sets !== "—";
  const repsText = override ? goalReps : ex.reps;
  const setsText = ex.sets && ex.sets !== "—" ? ex.sets : null;

  return (
    <li className="flex items-center justify-between gap-3 bg-paper-bright px-4 py-2.5">
      <div className="min-w-0">
        <p className="truncate font-medium text-ink">{ex.name}</p>
        {ex.target && <p className="text-xs text-muted">{ex.target}</p>}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <div className="text-right">
          <p className="text-sm font-medium text-ink-soft">
            {setsText ? `${setsText} × ${repsText}` : repsText || "—"}
          </p>
          {setsText && <p className="text-[0.7rem] uppercase tracking-wide text-faint">sets × reps</p>}
        </div>
        <button type="button" onClick={() => setEditing(true)} aria-label={`Edit ${ex.name}`} className="grid size-7 cursor-pointer place-items-center rounded-lg text-faint transition-colors hover:bg-card hover:text-ink">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => startTransition(() => { void deleteCustomExercise(ex.id); })}
          aria-label={`Remove ${ex.name}`}
          className="grid size-7 cursor-pointer place-items-center rounded-lg text-faint transition-colors hover:bg-card hover:text-danger"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><path d="M6 6l12 12M18 6 6 18" /></svg>
        </button>
      </div>
    </li>
  );
}

function AddExercise({ day }: { day: string }) {
  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [sets, setSets] = useState("3");
  const [reps, setReps] = useState("8–12");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const matches = searchExercises(name, 6).filter(
    (m) => m.name.toLowerCase() !== name.trim().toLowerCase(),
  );

  function submit() {
    setError(null);
    startTransition(async () => {
      const res = await addCustomExercise({ day, name, target, sets, reps });
      if (res.error) setError(res.error);
      else {
        setName("");
        setTarget("");
        setSets("3");
        setReps("8–12");
      }
    });
  }

  return (
    <div className="space-y-3 rounded-xl border border-line bg-card p-4">
      <p className="text-sm font-medium text-ink-soft">Add an exercise</p>
      <div className="relative">
        <input
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            const m = searchExercises(e.target.value, 1)[0];
            if (m && m.name.toLowerCase() === e.target.value.trim().toLowerCase()) setTarget(m.target);
          }}
          placeholder="Search the library or type your own…"
          className={`${inputCls} w-full`}
        />
        {matches.length > 0 && (
          <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-lg border border-line bg-card shadow-lg">
            {matches.map((m) => (
              <li key={m.name}>
                <button
                  type="button"
                  onClick={() => {
                    setName(m.name);
                    setTarget(m.target);
                  }}
                  className="flex w-full cursor-pointer items-center justify-between gap-3 px-3 py-2 text-left text-sm transition-colors hover:bg-paper"
                >
                  <span className="text-ink">{m.name}</span>
                  <span className="text-xs text-faint">{m.target}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        <input value={target} onChange={(e) => setTarget(e.target.value)} placeholder="Target — e.g. Chest" className={`${inputCls} flex-1`} />
        <input value={sets} onChange={(e) => setSets(e.target.value)} placeholder="Sets" className={`${inputCls} w-20`} />
        <input value={reps} onChange={(e) => setReps(e.target.value)} placeholder="Reps" className={`${inputCls} w-28`} />
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
      <button
        type="button"
        onClick={submit}
        disabled={pending || !name.trim()}
        className="cursor-pointer rounded-full bg-ink px-5 py-2 text-sm font-medium text-paper-bright transition-colors hover:bg-ink-soft disabled:opacity-60"
      >
        {pending ? "Adding…" : "Add to " + displayDay(day)}
      </button>
    </div>
  );
}
