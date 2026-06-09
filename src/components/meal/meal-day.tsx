"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import DateField from "@/components/date-field";
import { useToday } from "@/lib/use-today";
import { MEAL_TYPES, type Meal, type MealType } from "@/lib/nutrition";
import { listMealsForDay, updateMeal, removeMeal } from "@/app/app/meal/actions";

const numCls =
  "w-20 rounded-lg border border-line bg-card px-2.5 py-1.5 text-center text-sm text-ink placeholder:text-faint focus:border-ember focus:outline-none";

/** Browse any day's logged meals and edit/delete items in place. */
export default function MealDay({ initial }: { initial: Meal[] }) {
  const router = useRouter();
  const today = useToday();
  const [date, setDate] = useState(""); // "" = today (server-provided initial)
  const [fetched, setFetched] = useState<Meal[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [pending, startTransition] = useTransition();

  const activeDate = date || today;
  const meals = date && fetched !== null ? fetched : initial;

  async function pickDate(d: string) {
    setDate(d);
    if (!d || d === today) {
      setFetched(null);
      return;
    }
    setLoading(true);
    setFetched(await listMealsForDay(d));
    setLoading(false);
  }

  async function refresh() {
    if (date && date !== today) setFetched(await listMealsForDay(date));
    router.refresh();
  }

  function del(id: string) {
    startTransition(async () => {
      await removeMeal(id);
      await refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          {activeDate === today ? "Today" : "Viewing a past day"} — every item is
          editable.
        </p>
        <div className="w-44">
          <DateField value={activeDate} onChange={(d) => void pickDate(d)} max={today || undefined} />
        </div>
      </div>

      {loading ? (
        <div className="grid place-items-center py-10">
          <span className="size-5 animate-spin rounded-full border-2 border-line border-t-ember" />
        </div>
      ) : meals.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-12 text-center">
          <p className="font-display text-xl text-ink">Nothing logged</p>
          <p className="max-w-xs text-sm text-muted">
            {activeDate === today
              ? "Add your first meal on the left — totals and macros update as you go."
              : "No meals were logged on this day."}
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {MEAL_TYPES.map((mt) => {
            const items = meals.filter((m) => m.meal_type === mt.id);
            if (items.length === 0) return null;
            const groupCals = items.reduce((a, m) => a + m.calories, 0);
            return (
              <div key={mt.id}>
                <div className="mb-2 flex items-baseline justify-between">
                  <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-faint">
                    {mt.label}
                  </h3>
                  <span className="text-xs text-muted">{groupCals} kcal</span>
                </div>
                <ul className="space-y-2">
                  {items.map((m) => (
                    <MealRow key={m.id} meal={m} pending={pending} onDelete={() => del(m.id)} onSaved={refresh} />
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function MealRow({
  meal: m,
  pending,
  onDelete,
  onSaved,
}: {
  meal: Meal;
  pending: boolean;
  onDelete: () => void;
  onSaved: () => Promise<void>;
}) {
  const today = useToday();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(m.name);
  const [type, setType] = useState<MealType>(m.meal_type);
  const [date, setDate] = useState(m.eaten_on);
  const [vals, setVals] = useState({
    calories: String(m.calories),
    protein: String(m.protein),
    carbs: String(m.carbs),
    fat: String(m.fat),
  });
  const [error, setError] = useState<string | null>(null);
  const [busy, startTransition] = useTransition();

  function startEdit() {
    setName(m.name);
    setType(m.meal_type);
    setDate(m.eaten_on);
    setVals({
      calories: String(m.calories),
      protein: String(m.protein),
      carbs: String(m.carbs),
      fat: String(m.fat),
    });
    setError(null);
    setEditing(true);
  }

  function save() {
    setError(null);
    startTransition(async () => {
      const res = await updateMeal({
        id: m.id,
        name,
        mealType: type,
        date,
        calories: Number(vals.calories) || 0,
        protein: Number(vals.protein) || 0,
        carbs: Number(vals.carbs) || 0,
        fat: Number(vals.fat) || 0,
      });
      if (res.error) {
        setError(res.error);
        return;
      }
      setEditing(false);
      await onSaved();
    });
  }

  if (editing) {
    return (
      <li className="space-y-3 rounded-xl border border-ember/40 bg-paper-bright p-4">
        <div className="flex flex-wrap items-center gap-2.5">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Item name"
            className="min-w-0 flex-1 rounded-lg border border-line bg-card px-3 py-1.5 text-sm font-medium text-ink placeholder:text-faint focus:border-ember focus:outline-none"
          />
          <select
            value={type}
            onChange={(e) => setType(e.target.value as MealType)}
            className="cursor-pointer rounded-lg border border-line bg-card px-2.5 py-1.5 text-sm text-ink focus:border-ember focus:outline-none"
          >
            {MEAL_TYPES.map((t) => (
              <option key={t.id} value={t.id}>{t.label}</option>
            ))}
          </select>
          <div className="w-40">
            <DateField value={date} onChange={setDate} max={today || undefined} />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {(["calories", "protein", "carbs", "fat"] as const).map((k) => (
            <label key={k} className="flex items-center gap-1.5 text-xs text-muted">
              {k === "calories" ? "kcal" : k[0].toUpperCase()}
              <input
                type="number"
                min={0}
                value={vals[k]}
                onChange={(e) => setVals({ ...vals, [k]: e.target.value })}
                className={numCls}
              />
            </label>
          ))}
        </div>
        {error && <p className="text-sm text-danger">{error}</p>}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={save}
            disabled={busy}
            className="cursor-pointer rounded-full bg-ink px-4 py-1.5 text-sm font-medium text-paper-bright transition-colors hover:bg-ink-soft disabled:opacity-60"
          >
            {busy ? "Saving…" : "Save"}
          </button>
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="cursor-pointer text-sm font-medium text-muted transition-colors hover:text-ink"
          >
            Cancel
          </button>
        </div>
      </li>
    );
  }

  return (
    <li className="flex items-start justify-between gap-4 rounded-xl border border-line bg-paper-bright px-4 py-2.5">
      <div className="min-w-0">
        <p className="truncate font-medium text-ink">{m.name}</p>
        <p className="text-xs text-muted">
          {m.calories} kcal · P{m.protein} · C{m.carbs} · F{m.fat}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          onClick={startEdit}
          aria-label={`Edit ${m.name}`}
          className="grid size-8 cursor-pointer place-items-center rounded-lg text-faint transition-colors hover:bg-card hover:text-ink"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>
        </button>
        <button
          type="button"
          onClick={onDelete}
          disabled={pending}
          aria-label={`Delete ${m.name}`}
          className="grid size-8 cursor-pointer place-items-center rounded-lg text-faint transition-colors hover:bg-card hover:text-danger disabled:opacity-60"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M3 6h18M8 6V4h8v2m-9 0 1 14h8l1-14" /></svg>
        </button>
      </div>
    </li>
  );
}
