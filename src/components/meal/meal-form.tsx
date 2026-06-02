"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { addMeal, type MealActionState } from "@/app/app/meal/actions";
import { MEAL_TYPES, type MealType } from "@/lib/nutrition";
import DateField from "@/components/date-field";

const INITIAL: MealActionState = {};
const TODAY = new Date().toISOString().slice(0, 10);

export default function MealForm() {
  const [state, action, pending] = useActionState(addMeal, INITIAL);
  const formRef = useRef<HTMLFormElement>(null);
  const [type, setType] = useState<MealType>("breakfast");
  const [date, setDate] = useState(TODAY);

  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
      setDate(TODAY);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.ts, state.ok]);

  return (
    <form ref={formRef} action={action} className="flex flex-col gap-4">
      <input type="hidden" name="meal_type" value={type} />
      <input type="hidden" name="eaten_on" value={date} />

      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium text-ink-soft">Meal</span>
        <div className="flex flex-wrap gap-2">
          {MEAL_TYPES.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setType(m.id)}
              aria-pressed={type === m.id}
              className={`cursor-pointer rounded-full border px-3.5 py-2 text-sm font-medium transition-colors duration-200 ${
                type === m.id
                  ? "border-ember bg-ember text-paper-bright"
                  : "border-line bg-paper-bright text-ink-soft hover:border-line-strong"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-ink-soft">What did you eat?</span>
          <input
            type="text"
            name="name"
            required
            placeholder="e.g. Chicken & rice"
            className="rounded-xl border border-line bg-paper-bright px-4 py-2.5 text-[0.95rem] text-ink placeholder:text-faint transition-colors focus:border-ember focus:outline-none"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-ink-soft">Date</span>
          <DateField name="eaten_on" value={date} onChange={setDate} max={TODAY} />
        </label>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Num name="calories" label="Calories" placeholder="600" />
        <Num name="protein" label="Protein (g)" placeholder="40" />
        <Num name="carbs" label="Carbs (g)" placeholder="60" />
        <Num name="fat" label="Fat (g)" placeholder="20" />
      </div>

      {state.error && (
        <p role="alert" className="rounded-xl border border-danger/40 bg-danger/5 px-4 py-2.5 text-sm text-danger">
          {state.error}
        </p>
      )}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex cursor-pointer items-center justify-center rounded-xl bg-ink px-5 py-2.5 text-sm font-medium text-paper-bright shadow-[0_2px_8px_rgba(34,31,26,0.16)] transition-colors hover:bg-ink-soft disabled:cursor-not-allowed disabled:opacity-70"
        >
          {pending ? "Saving…" : "Log meal"}
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

function Num({
  name,
  label,
  placeholder,
}: {
  name: string;
  label: string;
  placeholder?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-ink-soft">{label}</span>
      <input
        type="number"
        name={name}
        min={0}
        inputMode="numeric"
        placeholder={placeholder}
        className="w-full rounded-xl border border-line bg-paper-bright px-4 py-2.5 text-[0.95rem] text-ink placeholder:text-faint transition-colors focus:border-ember focus:outline-none"
      />
    </label>
  );
}
