"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  logMeal,
  saveFavorite,
  deleteFavorite,
} from "@/app/app/meal/actions";
import {
  MEAL_TYPES,
  sumItems,
  type FoodItem,
  type Favorite,
  type MealType,
} from "@/lib/nutrition";
import { estimate, searchFoods, type Food } from "@/lib/food-db";
import { useToday } from "@/lib/use-today";
import DateField from "@/components/date-field";

export default function MealComposer({ favorites }: { favorites: Favorite[] }) {
  const router = useRouter();
  const today = useToday();
  const [type, setType] = useState<MealType>("breakfast");
  const [date, setDate] = useState("");
  const [items, setItems] = useState<FoodItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [logged, setLogged] = useState(false);
  const [pending, startTransition] = useTransition();

  // Estimator
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Food[]>([]);
  const [food, setFood] = useState<Food | null>(null);
  const [portion, setPortion] = useState("0");
  const [grams, setGrams] = useState("100");
  const searchRef = useRef<HTMLDivElement>(null);

  // Manual + save-favorite panels
  const [manual, setManual] = useState(false);
  const [m, setM] = useState({ name: "", calories: "", protein: "", carbs: "", fat: "" });
  const [savePanel, setSavePanel] = useState(false);
  const [favName, setFavName] = useState("");

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node))
        setResults([]);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const totals = sumItems(items);
  const usedGrams =
    food && (portion === "custom" ? Number(grams) || 0 : food.portions[Number(portion)].grams);
  const preview = food ? estimate(food, usedGrams || 0) : null;

  function addItem(item: FoodItem) {
    setItems((prev) => [...prev, item]);
    setLogged(false);
    setError(null);
  }

  function addEstimated() {
    if (!food || !preview) return;
    addItem({ name: food.name, ...preview });
    setFood(null);
    setQuery("");
    setPortion("0");
  }

  function addManual() {
    const name = m.name.trim();
    if (!name) return;
    addItem({
      name,
      calories: Number(m.calories) || 0,
      protein: Number(m.protein) || 0,
      carbs: Number(m.carbs) || 0,
      fat: Number(m.fat) || 0,
    });
    setM({ name: "", calories: "", protein: "", carbs: "", fat: "" });
  }

  function log() {
    if (items.length === 0) {
      setError("Add at least one item to log.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await logMeal({ mealType: type, date: date || today, items });
      if (res.error) {
        setError(res.error);
        return;
      }
      setItems([]);
      setLogged(true);
      router.refresh();
    });
  }

  function save() {
    const name = favName.trim();
    if (!name || items.length === 0) return;
    startTransition(async () => {
      const res = await saveFavorite({ name, items });
      if (res.error) {
        setError(res.error);
        return;
      }
      setSavePanel(false);
      setFavName("");
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Meal type */}
      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium text-ink-soft">Meal</span>
        <div className="flex flex-wrap gap-2">
          {MEAL_TYPES.map((mt) => (
            <button
              key={mt.id}
              type="button"
              onClick={() => setType(mt.id)}
              aria-pressed={type === mt.id}
              className={`cursor-pointer rounded-full border px-3.5 py-2 text-sm font-medium transition-colors duration-200 ${
                type === mt.id
                  ? "border-ember bg-ember text-paper-bright"
                  : "border-line bg-paper-bright text-ink-soft hover:border-line-strong"
              }`}
            >
              {mt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Date */}
      <div className="flex flex-col gap-1.5 sm:max-w-xs">
        <span className="text-sm font-medium text-ink-soft">Date</span>
        <DateField value={date || today} onChange={setDate} max={today || undefined} />
      </div>

      {/* Favorites */}
      {favorites.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-ink-soft">Favorites</span>
          <div className="flex flex-wrap gap-2">
            {favorites.map((f) => (
              <span
                key={f.id}
                className="group inline-flex items-center gap-1 rounded-full border border-line bg-paper-bright pl-3 pr-1.5 py-1 text-sm"
              >
                <button
                  type="button"
                  onClick={() => f.items.forEach(addItem)}
                  className="cursor-pointer font-medium text-ink-soft transition-colors hover:text-ember"
                >
                  {f.name}
                  {f.items.length > 1 && (
                    <span className="text-faint"> ·{f.items.length}</span>
                  )}
                </button>
                <button
                  type="button"
                  aria-label={`Delete favorite ${f.name}`}
                  onClick={() => startTransition(() => deleteFavorite(f.id).then(() => router.refresh()))}
                  className="grid size-5 cursor-pointer place-items-center rounded-full text-faint transition-colors hover:text-danger"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden><path d="M6 6l12 12M18 6 6 18" /></svg>
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Add item — estimator */}
      <div ref={searchRef} className="relative flex flex-col gap-1.5">
        <span className="text-sm font-medium text-ink-soft">Add an item</span>
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
          <ul className="absolute left-0 right-0 top-full z-20 mt-1 max-h-60 overflow-auto rounded-xl border border-line bg-card p-1.5 shadow-[0_18px_50px_-24px_rgba(0,0,0,0.5)]">
            {results.map((f) => (
              <li key={f.name}>
                <button
                  type="button"
                  onClick={() => {
                    setFood(f);
                    setPortion("0");
                    setQuery("");
                    setResults([]);
                  }}
                  className="flex w-full cursor-pointer items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-paper"
                >
                  <span className="font-medium text-ink">{f.name}</span>
                  <span className="text-xs text-faint">{f.per100.kcal} kcal/100g</span>
                </button>
              </li>
            ))}
          </ul>
        )}

        {food && (
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-line bg-paper-bright px-3 py-2 text-sm">
            <span className="font-medium text-ink">{food.name}</span>
            <select
              value={portion}
              onChange={(e) => setPortion(e.target.value)}
              className="cursor-pointer rounded-lg border border-line bg-card px-2.5 py-1 text-sm text-ink focus:border-ember focus:outline-none"
            >
              {food.portions.map((p, i) => (
                <option key={i} value={String(i)}>{p.label}</option>
              ))}
              <option value="custom">Custom (g)</option>
            </select>
            {portion === "custom" && (
              <input
                type="number"
                min={0}
                value={grams}
                onChange={(e) => setGrams(e.target.value)}
                className="w-20 rounded-lg border border-line bg-card px-2.5 py-1 text-sm text-ink focus:border-ember focus:outline-none"
              />
            )}
            {preview && (
              <span className="text-muted">
                ≈ {preview.calories} kcal · P{preview.protein} C{preview.carbs} F{preview.fat}
              </span>
            )}
            <button
              type="button"
              onClick={addEstimated}
              className="ml-auto cursor-pointer rounded-lg bg-ink px-3 py-1.5 text-sm font-medium text-paper-bright transition-colors hover:bg-ink-soft"
            >
              Add
            </button>
          </div>
        )}

        <button
          type="button"
          onClick={() => setManual((v) => !v)}
          className="w-fit cursor-pointer text-xs font-medium text-muted underline underline-offset-2 transition-colors hover:text-ember"
        >
          {manual ? "Hide custom item" : "+ Add a custom item"}
        </button>

        {manual && (
          <div className="rounded-xl border border-line bg-paper-bright p-3">
            <input
              type="text"
              value={m.name}
              onChange={(e) => setM({ ...m, name: e.target.value })}
              placeholder="Item name"
              className="mb-2 w-full rounded-lg border border-line bg-card px-3 py-2 text-sm text-ink placeholder:text-faint focus:border-ember focus:outline-none"
            />
            <div className="grid grid-cols-4 gap-2">
              {(["calories", "protein", "carbs", "fat"] as const).map((k) => (
                <input
                  key={k}
                  type="number"
                  min={0}
                  value={m[k]}
                  onChange={(e) => setM({ ...m, [k]: e.target.value })}
                  placeholder={k === "calories" ? "kcal" : `${k[0].toUpperCase()}g`}
                  className="rounded-lg border border-line bg-card px-2.5 py-2 text-sm text-ink placeholder:text-faint focus:border-ember focus:outline-none"
                />
              ))}
            </div>
            <button
              type="button"
              onClick={addManual}
              className="mt-2 cursor-pointer rounded-lg bg-ink px-3 py-1.5 text-sm font-medium text-paper-bright transition-colors hover:bg-ink-soft"
            >
              Add item
            </button>
          </div>
        )}
      </div>

      {/* Built meal */}
      {items.length > 0 && (
        <div className="rounded-xl border border-line bg-paper-bright p-3">
          <ul className="space-y-1.5">
            {items.map((it, i) => (
              <li key={i} className="flex items-center justify-between gap-3 text-sm">
                <span className="min-w-0 truncate text-ink">{it.name}</span>
                <span className="flex shrink-0 items-center gap-2.5">
                  <span className="text-muted">{it.calories} kcal</span>
                  <button
                    type="button"
                    onClick={() =>
                      startTransition(() =>
                        saveFavorite({ name: it.name, items: [it] }).then(() =>
                          router.refresh(),
                        ),
                      )
                    }
                    aria-label={`Save ${it.name} as a favorite`}
                    title="Save item as favorite"
                    className="grid size-6 cursor-pointer place-items-center rounded-md text-faint transition-colors hover:text-ember"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M12 17.3l-5.4 3.2 1.4-6.1L3 9.8l6.2-.5L12 3.6l2.8 5.7 6.2.5-4.9 4.6 1.4 6.1z" /></svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => setItems(items.filter((_, idx) => idx !== i))}
                    aria-label={`Remove ${it.name}`}
                    className="grid size-6 cursor-pointer place-items-center rounded-md text-faint transition-colors hover:text-danger"
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden><path d="M6 6l12 12M18 6 6 18" /></svg>
                  </button>
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-2 flex items-center justify-between border-t border-line pt-2 text-sm">
            <span className="font-medium text-ink">Total</span>
            <span className="text-muted">
              {totals.calories} kcal · P{totals.protein} C{totals.carbs} F{totals.fat}
            </span>
          </div>
        </div>
      )}

      {error && (
        <p role="alert" className="rounded-xl border border-danger/40 bg-danger/5 px-4 py-2.5 text-sm text-danger">
          {error}
        </p>
      )}

      {/* Save favorite */}
      {savePanel && (
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={favName}
            onChange={(e) => setFavName(e.target.value)}
            placeholder="Favorite name (e.g. My breakfast)"
            className="flex-1 rounded-xl border border-line bg-paper-bright px-4 py-2.5 text-sm text-ink placeholder:text-faint focus:border-ember focus:outline-none"
          />
          <button
            type="button"
            onClick={save}
            disabled={pending || !favName.trim() || items.length === 0}
            className="cursor-pointer rounded-xl bg-ink px-4 py-2.5 text-sm font-medium text-paper-bright transition-colors hover:bg-ink-soft disabled:opacity-60"
          >
            Save
          </button>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={log}
          disabled={pending || items.length === 0}
          className="inline-flex cursor-pointer items-center justify-center rounded-xl bg-ink px-5 py-2.5 text-sm font-medium text-paper-bright shadow-[0_2px_8px_rgba(34,31,26,0.16)] transition-colors hover:bg-ink-soft disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? "Saving…" : "Log meal"}
        </button>
        {items.length > 0 && (
          <button
            type="button"
            onClick={() => setSavePanel((v) => !v)}
            className="cursor-pointer text-sm font-medium text-ember transition-colors hover:text-ink"
          >
            Save as favorite
          </button>
        )}
        {logged && !pending && (
          <span role="status" className="text-sm text-ember">
            Logged.
          </span>
        )}
      </div>
    </div>
  );
}
