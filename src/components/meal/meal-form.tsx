"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { addMeal, type MealActionState } from "@/app/app/meal/actions";
import { MEAL_TYPES, type MealType } from "@/lib/nutrition";
import { estimate, searchFoods, type Food } from "@/lib/food-db";
import DateField from "@/components/date-field";

const INITIAL: MealActionState = {};
const TODAY = new Date().toISOString().slice(0, 10);

export default function MealForm() {
  const [state, action, pending] = useActionState(addMeal, INITIAL);
  const [type, setType] = useState<MealType>("breakfast");
  const [date, setDate] = useState(TODAY);
  const [name, setName] = useState("");
  const [calories, setCalories] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fat, setFat] = useState("");

  // Estimator
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Food[]>([]);
  const [food, setFood] = useState<Food | null>(null);
  const [portion, setPortion] = useState<string>("0");
  const [grams, setGrams] = useState("100");
  const [estimated, setEstimated] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  function reset() {
    setName("");
    setCalories("");
    setProtein("");
    setCarbs("");
    setFat("");
    setQuery("");
    setResults([]);
    setFood(null);
    setPortion("0");
    setGrams("100");
    setEstimated(false);
    setDate(TODAY);
  }

  useEffect(() => {
    if (state.ok) reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.ts, state.ok]);

  // Close results on outside click.
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node))
        setResults([]);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  function applyEstimate(f: Food, g: number) {
    const e = estimate(f, g);
    setCalories(String(e.calories));
    setProtein(String(e.protein));
    setCarbs(String(e.carbs));
    setFat(String(e.fat));
    setEstimated(true);
  }

  function selectFood(f: Food) {
    setFood(f);
    setName(f.name);
    setPortion("0");
    setQuery("");
    setResults([]);
    applyEstimate(f, f.portions[0].grams);
  }

  function changePortion(value: string) {
    setPortion(value);
    if (!food) return;
    if (value === "custom") {
      applyEstimate(food, Number(grams) || 0);
    } else {
      applyEstimate(food, food.portions[Number(value)].grams);
    }
  }

  return (
    <form action={action} className="flex flex-col gap-4">
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

      {/* Estimator: search a food to auto-fill the numbers */}
      <div ref={searchRef} className="relative flex flex-col gap-1.5">
        <span className="text-sm font-medium text-ink-soft">
          Estimate from a food <span className="text-faint">(optional)</span>
        </span>
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setResults(searchFoods(e.target.value));
          }}
          placeholder="Search e.g. chicken, rice, banana…"
          className="rounded-xl border border-line bg-paper-bright px-4 py-2.5 text-[0.95rem] text-ink placeholder:text-faint transition-colors focus:border-ember focus:outline-none"
        />
        {results.length > 0 && (
          <ul className="absolute left-0 right-0 top-full z-20 mt-1 max-h-64 overflow-auto rounded-xl border border-line bg-card p-1.5 shadow-[0_18px_50px_-24px_rgba(0,0,0,0.5)]">
            {results.map((f) => (
              <li key={f.name}>
                <button
                  type="button"
                  onClick={() => selectFood(f)}
                  className="flex w-full cursor-pointer items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-paper"
                >
                  <span className="font-medium text-ink">{f.name}</span>
                  <span className="text-xs text-faint">
                    {f.per100.kcal} kcal/100g
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}

        {food && (
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm">
            <span className="text-muted">{food.name} ·</span>
            <select
              value={portion}
              onChange={(e) => changePortion(e.target.value)}
              className="cursor-pointer rounded-lg border border-line bg-paper-bright px-3 py-1.5 text-sm text-ink focus:border-ember focus:outline-none"
            >
              {food.portions.map((p, i) => (
                <option key={i} value={String(i)}>
                  {p.label}
                </option>
              ))}
              <option value="custom">Custom (g)</option>
            </select>
            {portion === "custom" && (
              <input
                type="number"
                min={0}
                value={grams}
                onChange={(e) => {
                  setGrams(e.target.value);
                  if (food) applyEstimate(food, Number(e.target.value) || 0);
                }}
                className="w-24 rounded-lg border border-line bg-paper-bright px-3 py-1.5 text-sm text-ink focus:border-ember focus:outline-none"
              />
            )}
            <button
              type="button"
              onClick={() => {
                setFood(null);
                setEstimated(false);
              }}
              className="cursor-pointer text-xs font-medium text-muted underline underline-offset-2 hover:text-ink"
            >
              clear
            </button>
          </div>
        )}
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-ink-soft">Name</span>
        <input
          type="text"
          name="name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Chicken & rice"
          className="rounded-xl border border-line bg-paper-bright px-4 py-2.5 text-[0.95rem] text-ink placeholder:text-faint transition-colors focus:border-ember focus:outline-none"
        />
      </label>

      <div className="flex items-baseline justify-between">
        <span className="text-sm font-medium text-ink-soft">Nutrition</span>
        {estimated && (
          <span className="text-xs text-ember">Estimated — adjust if needed</span>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Num name="calories" label="Calories" value={calories} onChange={setCalories} placeholder="600" />
        <Num name="protein" label="Protein (g)" value={protein} onChange={setProtein} placeholder="40" />
        <Num name="carbs" label="Carbs (g)" value={carbs} onChange={setCarbs} placeholder="60" />
        <Num name="fat" label="Fat (g)" value={fat} onChange={setFat} placeholder="20" />
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
  value,
  onChange,
  placeholder,
}: {
  name: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
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
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-line bg-paper-bright px-4 py-2.5 text-[0.95rem] text-ink placeholder:text-faint transition-colors focus:border-ember focus:outline-none"
      />
    </label>
  );
}
