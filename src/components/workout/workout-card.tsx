"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import DateField from "@/components/date-field";
import { useToday } from "@/lib/use-today";
import {
  dayColor,
  displayDay,
  formatDate,
  GENERAL_DAYS,
} from "@/lib/workouts";
import { updateSession, deleteWorkout } from "@/app/app/workout/actions";

export type CardExercise = {
  exercise: string;
  sets: { weight: number | null; reps: number | null }[];
};
type SetInput = { weight: string; reps: string };
type EntryInput = { exercise: string; sets: SetInput[] };

const numCls =
  "w-20 rounded-lg border border-line bg-paper-bright px-2.5 py-1.5 text-center text-sm text-ink placeholder:text-faint focus:border-ember focus:outline-none";

function setLabel(s: { weight: number | null; reps: number | null }): string {
  if (s.weight != null && s.reps != null) return `${s.weight}×${s.reps}`;
  if (s.reps != null) return `${s.reps}`;
  if (s.weight != null) return `${s.weight}`;
  return "";
}

export default function WorkoutCard({
  workout,
  exercises,
  days,
  weightUnit = "kg",
}: {
  workout: {
    id: string;
    performed_on: string;
    category: string;
    title: string;
    duration_min: number | null;
    notes: string | null;
  };
  exercises: CardExercise[];
  days: string[];
  weightUnit?: string;
}) {
  const router = useRouter();
  const today = useToday();
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // edit state
  const [day, setDay] = useState(workout.category);
  const [date, setDate] = useState(workout.performed_on);
  const [title, setTitle] = useState(workout.title);
  const [duration, setDuration] = useState(
    workout.duration_min != null ? String(workout.duration_min) : "",
  );
  const [notes, setNotes] = useState(workout.notes ?? "");
  const [entries, setEntries] = useState<EntryInput[]>([]);

  function startEdit() {
    setDay(workout.category);
    setDate(workout.performed_on);
    setTitle(workout.title);
    setDuration(workout.duration_min != null ? String(workout.duration_min) : "");
    setNotes(workout.notes ?? "");
    setEntries(
      exercises.map((e) => ({
        exercise: e.exercise,
        sets: e.sets.map((s) => ({
          weight: s.weight != null ? String(s.weight) : "",
          reps: s.reps != null ? String(s.reps) : "",
        })),
      })),
    );
    setError(null);
    setEditing(true);
  }

  // entry mutators
  const setEx = (i: number, name: string) =>
    setEntries((e) => e.map((x, idx) => (idx === i ? { ...x, exercise: name } : x)));
  const setCell = (i: number, j: number, key: keyof SetInput, v: string) =>
    setEntries((e) =>
      e.map((x, idx) =>
        idx === i
          ? { ...x, sets: x.sets.map((s, k) => (k === j ? { ...s, [key]: v } : s)) }
          : x,
      ),
    );
  const addSet = (i: number) =>
    setEntries((e) =>
      e.map((x, idx) => (idx === i ? { ...x, sets: [...x.sets, { weight: "", reps: "" }] } : x)),
    );
  const removeSet = (i: number, j: number) =>
    setEntries((e) =>
      e.map((x, idx) => (idx === i ? { ...x, sets: x.sets.filter((_, k) => k !== j) } : x)),
    );
  const removeEx = (i: number) => setEntries((e) => e.filter((_, idx) => idx !== i));
  const addEx = () =>
    setEntries((e) => [...e, { exercise: "", sets: [{ weight: "", reps: "" }] }]);

  function save() {
    setError(null);
    const payload = entries.map((en) => ({
      exercise: en.exercise,
      sets: en.sets.map((s) => ({
        weight: s.weight === "" ? null : Number(s.weight),
        reps: s.reps === "" ? null : Number(s.reps),
      })),
    }));
    startTransition(async () => {
      const res = await updateSession({
        workoutId: workout.id,
        day,
        date: date || today,
        title,
        durationMin: duration === "" ? null : Number(duration),
        notes,
        entries: payload,
      });
      if (res.error) {
        setError(res.error);
        return;
      }
      setEditing(false);
      router.refresh();
    });
  }

  // ---- view ----
  if (!editing) {
    return (
      <li className="flex items-start justify-between gap-4 rounded-xl border border-line bg-paper-bright px-4 py-3">
        <div className="min-w-0">
          <div className="mb-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs">
            <span className="inline-flex items-center gap-1.5 font-medium text-ink-soft">
              <span className="inline-block size-2 rounded-full" style={{ backgroundColor: dayColor(workout.category) }} />
              {displayDay(workout.category)}
            </span>
            <span className="text-faint">{formatDate(workout.performed_on)}</span>
          </div>
          <p className="truncate font-medium text-ink">{workout.title}</p>
          {exercises.length > 0 && (
            <div className="mt-1 space-y-0.5">
              {exercises.map((g) => (
                <p key={g.exercise} className="text-xs text-muted">
                  <span className="text-ink-soft">{g.exercise}</span>{" "}
                  {g.sets.map(setLabel).filter(Boolean).join(", ")}
                </p>
              ))}
            </div>
          )}
          {workout.notes && (
            <p className="mt-0.5 text-sm leading-relaxed text-muted">{workout.notes}</p>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {workout.duration_min != null && (
            <span className="text-sm font-medium text-muted">{workout.duration_min}m</span>
          )}
          <button
            type="button"
            onClick={startEdit}
            aria-label={`Edit ${workout.title}`}
            className="grid size-8 cursor-pointer place-items-center rounded-lg text-faint transition-colors hover:bg-card hover:text-ink"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>
          </button>
          <form action={deleteWorkout}>
            <input type="hidden" name="id" value={workout.id} />
            <button
              type="submit"
              aria-label={`Delete ${workout.title}`}
              className="grid size-8 cursor-pointer place-items-center rounded-lg text-faint transition-colors hover:bg-card hover:text-danger"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M3 6h18M8 6V4h8v2m-9 0 1 14h8l1-14" /></svg>
            </button>
          </form>
        </div>
      </li>
    );
  }

  // ---- edit ----
  const dayChips = [...new Set([...days, ...GENERAL_DAYS, workout.category])];
  return (
    <li className="rounded-xl border border-ember/40 bg-paper-bright p-4">
      <div className="space-y-4">
        {/* Day */}
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium text-ink-soft">Day</span>
          <div className="flex flex-wrap gap-2">
            {dayChips.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDay(d)}
                aria-pressed={day === d}
                className={`cursor-pointer rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  day === d
                    ? "border-ember bg-ember/10 text-ink"
                    : "border-line bg-paper-bright text-ink-soft hover:border-ember/50"
                }`}
              >
                {displayDay(d)}
              </button>
            ))}
          </div>
        </div>

        {/* Date + title + minutes */}
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-ink-soft">Date</span>
            <DateField value={date} onChange={setDate} max={today || undefined} />
          </div>
          <label className="flex flex-1 flex-col gap-1.5" style={{ minWidth: "12rem" }}>
            <span className="text-sm font-medium text-ink-soft">Title</span>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={day}
              className="rounded-xl border border-line bg-paper-bright px-4 py-2.5 text-[0.95rem] text-ink placeholder:text-faint focus:border-ember focus:outline-none"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-ink-soft">Minutes</span>
            <input
              type="number"
              min={0}
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              placeholder="45"
              className="w-24 rounded-xl border border-line bg-paper-bright px-4 py-2.5 text-[0.95rem] text-ink placeholder:text-faint focus:border-ember focus:outline-none"
            />
          </label>
        </div>

        {/* Exercises */}
        <div className="space-y-3">
          {entries.map((en, i) => (
            <div key={i} className="rounded-xl border border-line bg-card p-3.5">
              <div className="mb-2 flex items-center gap-2">
                <input
                  type="text"
                  value={en.exercise}
                  onChange={(e) => setEx(i, e.target.value)}
                  placeholder="Exercise name"
                  className="min-w-0 flex-1 rounded-lg border border-line bg-paper-bright px-3 py-1.5 text-sm font-medium text-ink placeholder:text-faint focus:border-ember focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => removeEx(i)}
                  aria-label="Remove exercise"
                  className="grid size-7 cursor-pointer place-items-center rounded-lg text-faint transition-colors hover:bg-paper hover:text-danger"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M3 6h18M8 6V4h8v2m-9 0 1 14h8l1-14" /></svg>
                </button>
              </div>
              <div className="space-y-1.5">
                {en.sets.map((s, j) => (
                  <div key={j} className="flex items-center gap-2">
                    <span className="w-10 text-xs text-faint">Set {j + 1}</span>
                    <input
                      type="number"
                      inputMode="decimal"
                      min={0}
                      step="any"
                      value={s.weight}
                      onChange={(e) => setCell(i, j, "weight", e.target.value)}
                      placeholder={weightUnit}
                      className={numCls}
                    />
                    <span className="text-faint">×</span>
                    <input
                      type="number"
                      inputMode="numeric"
                      min={0}
                      value={s.reps}
                      onChange={(e) => setCell(i, j, "reps", e.target.value)}
                      placeholder="reps"
                      className={numCls}
                    />
                    {en.sets.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeSet(i, j)}
                        aria-label="Remove set"
                        className="grid size-7 cursor-pointer place-items-center rounded-lg text-faint transition-colors hover:bg-paper hover:text-danger"
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden><path d="M6 6l12 12M18 6 6 18" /></svg>
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() => addSet(i)}
                className="mt-2 cursor-pointer text-xs font-medium text-ember transition-colors hover:text-ink"
              >
                + Add set
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={addEx}
            className="cursor-pointer rounded-lg border border-dashed border-line-strong px-3 py-1.5 text-xs font-medium text-ink-soft transition-colors hover:border-ember hover:text-ink"
          >
            + Add exercise
          </button>
        </div>

        {/* Notes */}
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-ink-soft">Notes</span>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="How did it go?"
            className="resize-none rounded-xl border border-line bg-paper-bright px-4 py-2.5 text-[0.95rem] text-ink placeholder:text-faint focus:border-ember focus:outline-none"
          />
        </label>

        {error && <p className="text-sm text-danger">{error}</p>}

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={save}
            disabled={pending}
            className="cursor-pointer rounded-xl bg-ink px-5 py-2.5 text-sm font-medium text-paper-bright transition-colors hover:bg-ink-soft disabled:opacity-70"
          >
            {pending ? "Saving…" : "Save changes"}
          </button>
          <button
            type="button"
            onClick={() => {
              setEditing(false);
              setError(null);
            }}
            disabled={pending}
            className="cursor-pointer text-sm font-medium text-muted transition-colors hover:text-ink disabled:opacity-60"
          >
            Cancel
          </button>
        </div>
      </div>
    </li>
  );
}
