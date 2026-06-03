"use client";

import { useEffect, useState, useTransition } from "react";
import { logSession } from "@/app/app/workout/actions";
import { GENERAL_DAYS } from "@/lib/workouts";
import type { CustomExercise } from "@/lib/exercise-guide";
import { useToday } from "@/lib/use-today";
import DateField from "@/components/date-field";

type SetInput = { weight: string; reps: string };
type Last = Record<string, { weight: number | null; reps: number | null }>;

const numCls =
  "w-20 rounded-lg border border-line bg-paper-bright px-2.5 py-1.5 text-center text-sm text-ink placeholder:text-faint focus:border-ember focus:outline-none";

export default function WorkoutForm({
  days,
  customByDay,
  lastByExercise,
}: {
  days: string[];
  customByDay: Record<string, CustomExercise[]>;
  lastByExercise: Last;
}) {
  const today = useToday();
  const [day, setDay] = useState(days[0] ?? GENERAL_DAYS[0]);

  const seed = (name: string): SetInput => {
    const l = lastByExercise[name];
    return {
      weight: l?.weight != null ? String(l.weight) : "",
      reps: l?.reps != null ? String(l.reps) : "",
    };
  };
  const buildEntries = (d: string): Record<string, SetInput[]> => {
    const init: Record<string, SetInput[]> = {};
    for (const ex of customByDay[d] ?? []) init[ex.name] = [seed(ex.name)];
    return init;
  };

  const [date, setDate] = useState("");
  const [entries, setEntries] = useState<Record<string, SetInput[]>>(() =>
    buildEntries(days[0] ?? GENERAL_DAYS[0]),
  );
  const [title, setTitle] = useState("");
  const [duration, setDuration] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();

  const program = customByDay[day] ?? [];
  const isQuick = program.length === 0;

  // Re-seed the set inputs whenever the selected day changes.
  useEffect(() => {
    setEntries(buildEntries(day));
    setDone(false);
    setError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [day]);

  function setField(ex: string, i: number, key: keyof SetInput, v: string) {
    setEntries((e) => {
      const rows = [...(e[ex] ?? [])];
      rows[i] = { ...rows[i], [key]: v };
      return { ...e, [ex]: rows };
    });
  }
  function addSet(ex: string) {
    setEntries((e) => ({ ...e, [ex]: [...(e[ex] ?? []), { weight: "", reps: "" }] }));
  }
  function removeSet(ex: string, i: number) {
    setEntries((e) => ({ ...e, [ex]: (e[ex] ?? []).filter((_, idx) => idx !== i) }));
  }

  function save() {
    setError(null);
    const entryArr = program.map((ex) => ({
      exercise: ex.name,
      sets: (entries[ex.name] ?? []).map((s) => ({
        weight: s.weight === "" ? null : Number(s.weight),
        reps: s.reps === "" ? null : Number(s.reps),
      })),
    }));
    startTransition(async () => {
      const res = await logSession({
        day,
        date: date || today,
        title: isQuick ? title : undefined,
        durationMin: duration === "" ? null : Number(duration),
        notes,
        entries: isQuick ? [] : entryArr,
      });
      if (res.error) {
        setError(res.error);
        return;
      }
      setDone(true);
      setTitle("");
      setDuration("");
      setNotes("");
      const init: Record<string, SetInput[]> = {};
      for (const ex of program) init[ex.name] = [seed(ex.name)];
      setEntries(init);
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Day */}
      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium text-ink-soft">Day</span>
        <div className="flex flex-wrap gap-2">
          {days.map((d) => (
            <Chip key={d} label={d} active={day === d} onClick={() => setDay(d)} />
          ))}
          {GENERAL_DAYS.map((d) => (
            <Chip key={d} label={d} active={day === d} onClick={() => setDay(d)} muted />
          ))}
        </div>
      </div>

      {/* Date */}
      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-ink-soft">Date</span>
        <DateField value={date || today} onChange={setDate} max={today || undefined} />
      </div>

      {isQuick ? (
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-ink-soft">
            What did you do? <span className="text-faint">(this day has no exercises yet)</span>
          </span>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={`e.g. ${day} session, 5k run`}
            className="rounded-xl border border-line bg-paper-bright px-4 py-2.5 text-[0.95rem] text-ink placeholder:text-faint focus:border-ember focus:outline-none"
          />
        </label>
      ) : (
        <div className="space-y-3">
          {program.map((ex) => (
            <div key={ex.id} className="rounded-xl border border-line bg-paper-bright p-3.5">
              <div className="mb-2 flex items-baseline justify-between gap-3">
                <p className="font-medium text-ink">{ex.name}</p>
                {ex.sets && ex.reps && (
                  <span className="text-xs text-faint">
                    target {ex.sets} × {ex.reps}
                  </span>
                )}
              </div>
              <div className="space-y-1.5">
                {(entries[ex.name] ?? []).map((s, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="w-10 text-xs text-faint">Set {i + 1}</span>
                    <input
                      type="number"
                      inputMode="decimal"
                      min={0}
                      step="any"
                      value={s.weight}
                      onChange={(e) => setField(ex.name, i, "weight", e.target.value)}
                      placeholder="kg"
                      className={numCls}
                    />
                    <span className="text-faint">×</span>
                    <input
                      type="number"
                      inputMode="numeric"
                      min={0}
                      value={s.reps}
                      onChange={(e) => setField(ex.name, i, "reps", e.target.value)}
                      placeholder="reps"
                      className={numCls}
                    />
                    {(entries[ex.name] ?? []).length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeSet(ex.name, i)}
                        aria-label="Remove set"
                        className="grid size-7 cursor-pointer place-items-center rounded-lg text-faint transition-colors hover:bg-card hover:text-danger"
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden><path d="M6 6l12 12M18 6 6 18" /></svg>
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() => addSet(ex.name)}
                className="mt-2 cursor-pointer text-xs font-medium text-ember transition-colors hover:text-ink"
              >
                + Add set
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Session details */}
      <div className="flex flex-wrap gap-3">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-ink-soft">
            Minutes <span className="text-faint">(optional)</span>
          </span>
          <input
            type="number"
            min={0}
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            placeholder="45"
            className="w-28 rounded-xl border border-line bg-paper-bright px-4 py-2.5 text-[0.95rem] text-ink placeholder:text-faint focus:border-ember focus:outline-none"
          />
        </label>
      </div>
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-ink-soft">
          Notes <span className="text-faint">(optional)</span>
        </span>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder="How did it go?"
          className="resize-none rounded-xl border border-line bg-paper-bright px-4 py-2.5 text-[0.95rem] text-ink placeholder:text-faint focus:border-ember focus:outline-none"
        />
      </label>

      {error && (
        <p role="alert" className="rounded-xl border border-danger/40 bg-danger/5 px-4 py-2.5 text-sm text-danger">
          {error}
        </p>
      )}

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={pending}
          className="inline-flex cursor-pointer items-center justify-center rounded-xl bg-ink px-5 py-2.5 text-sm font-medium text-paper-bright shadow-[0_2px_8px_rgba(34,31,26,0.16)] transition-all duration-200 hover:bg-ink-soft disabled:cursor-not-allowed disabled:opacity-70"
        >
          {pending ? "Saving…" : "Log workout"}
        </button>
        {done && !pending && <span role="status" className="text-sm text-ember">Logged.</span>}
      </div>
    </div>
  );
}

function Chip({
  label,
  active,
  onClick,
  muted = false,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  muted?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`cursor-pointer rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors ${
        active
          ? "border-ember bg-ember/10 text-ink"
          : `border-line bg-paper-bright hover:border-ember/50 ${muted ? "text-muted" : "text-ink-soft"}`
      }`}
    >
      {label}
    </button>
  );
}
