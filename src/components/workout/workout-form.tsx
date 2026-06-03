"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { addWorkout, type WorkoutActionState } from "@/app/app/workout/actions";
import { GENERAL_DAYS, dayColor } from "@/lib/workouts";
import { useToday } from "@/lib/use-today";
import DateField from "@/components/date-field";

const INITIAL: WorkoutActionState = {};

export default function WorkoutForm({ days }: { days: string[] }) {
  const today = useToday();
  const [state, action, pending] = useActionState(addWorkout, INITIAL);
  const formRef = useRef<HTMLFormElement>(null);
  const [day, setDay] = useState(days[0] ?? GENERAL_DAYS[0]);
  const [date, setDate] = useState("");

  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
      setDay(days[0] ?? GENERAL_DAYS[0]);
      setDate("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.ts, state.ok]);

  return (
    <form ref={formRef} action={action} className="flex flex-col gap-4">
      <input type="hidden" name="category" value={day} />

      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-ink-soft">Date</span>
        <DateField
          name="performed_on"
          value={date || today}
          onChange={setDate}
          max={today || undefined}
        />
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium text-ink-soft">Day</span>
        <div className="flex flex-wrap gap-2">
          {days.map((d) => (
            <Chip key={d} label={d} active={day === d} onClick={() => setDay(d)} />
          ))}
        </div>
        <div className="mt-1 flex flex-wrap gap-2">
          {GENERAL_DAYS.map((d) => (
            <Chip key={d} label={d} active={day === d} onClick={() => setDay(d)} muted />
          ))}
        </div>
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-ink-soft">Title</span>
        <input
          type="text"
          name="title"
          required
          placeholder="e.g. Push day, 5k run"
          className="rounded-xl border border-line bg-paper-bright px-4 py-2.5 text-[0.95rem] text-ink placeholder:text-faint transition-colors focus:border-ember focus:outline-none"
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-ink-soft">
          Minutes <span className="text-faint">(optional)</span>
        </span>
        <input
          type="number"
          name="duration_min"
          min={0}
          inputMode="numeric"
          placeholder="45"
          className="w-32 rounded-xl border border-line bg-paper-bright px-4 py-2.5 text-[0.95rem] text-ink placeholder:text-faint transition-colors focus:border-ember focus:outline-none"
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-ink-soft">
          Notes <span className="text-faint">(optional)</span>
        </span>
        <textarea
          name="notes"
          rows={2}
          placeholder="How did it go?"
          className="resize-none rounded-xl border border-line bg-paper-bright px-4 py-2.5 text-[0.95rem] text-ink placeholder:text-faint transition-colors focus:border-ember focus:outline-none"
        />
      </label>

      {state.error && (
        <p
          role="alert"
          className="rounded-xl border border-danger/40 bg-danger/5 px-4 py-2.5 text-sm text-danger"
        >
          {state.error}
        </p>
      )}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-ink px-5 py-2.5 text-sm font-medium text-paper-bright shadow-[0_2px_8px_rgba(34,31,26,0.16)] transition-all duration-200 hover:bg-ink-soft disabled:cursor-not-allowed disabled:opacity-70"
        >
          {pending ? "Saving…" : "Log workout"}
        </button>
        {state.ok && !pending && (
          <span role="status" className="text-sm text-ember">
            Logged.
          </span>
        )}
      </div>
    </form>
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
      className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-medium transition-colors duration-200 ${
        active
          ? "border-ember bg-ember text-paper-bright"
          : "border-line bg-paper-bright text-ink-soft hover:border-line-strong"
      }`}
    >
      {!muted && !active && (
        <span
          className="inline-block size-2 rounded-full"
          style={{ backgroundColor: dayColor(label) }}
        />
      )}
      {label}
    </button>
  );
}
