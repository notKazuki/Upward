import type { Metadata } from "next";
import DashboardCard from "@/components/dashboard/card";
import MealComposer from "@/components/meal/meal-composer";
import MealDay from "@/components/meal/meal-day";
import TargetsEditor from "@/components/meal/targets-editor";
import GoalSelector from "@/components/meal/goal-selector";
import { createClient } from "@/lib/supabase/server";
import { currentUser } from "@/lib/auth";
import type { Gender } from "@/lib/onboarding";
import {
  effectiveTargets,
  MACROS,
  pct,
  suggestTargets,
  sumMeals,
  type Favorite,
  type Goal,
  type Meal,
  type Targets,
} from "@/lib/nutrition";
import { serverToday } from "@/lib/server-today";

export const metadata: Metadata = { title: "Meal — Upward" };

export default async function MealPage() {
  const supabase = await createClient();
  const user = await currentUser();
  const today = await serverToday();

  const [mealsRes, profRes, favRes] = await Promise.all([
    supabase
      .from("meals")
      .select("*")
      .eq("eaten_on", today)
      .order("created_at", { ascending: true }),
    supabase
      .from("profiles")
      .select("dob, gender, height_cm, weight_kg, nutrition_targets")
      .eq("id", user!.id)
      .maybeSingle(),
    supabase
      .from("favorites")
      .select("id, name, items")
      .order("created_at", { ascending: false }),
  ]);

  const favorites = (favRes.error ? [] : (favRes.data ?? [])) as Favorite[];

  if (mealsRes.error || profRes.error) {
    return (
      <div className="mx-auto max-w-7xl space-y-5">
        <Header />
        <DashboardCard title="One step left">
          <p className="text-sm leading-relaxed text-muted">
            Run <code className="text-ink">supabase/meals.sql</code> in Supabase
            → <b>SQL Editor</b>, then refresh this page.
          </p>
        </DashboardCard>
      </div>
    );
  }

  // Goal lives in its own query so a missing column (migration not yet run)
  // degrades to "maintain" instead of breaking the whole page.
  const goalRes = await supabase
    .from("profiles")
    .select("nutrition_goal")
    .eq("id", user!.id)
    .maybeSingle();
  const goal: Goal =
    ((goalRes.data?.nutrition_goal as Goal | null) ?? "maintain") || "maintain";

  const meals = (mealsRes.data ?? []) as Meal[];
  const profile = profRes.data;
  const suggested = suggestTargets(
    {
      dob: (profile?.dob as string | null) ?? null,
      gender: (profile?.gender as Gender | null) ?? null,
      height_cm: (profile?.height_cm as number | null) ?? null,
      weight_kg: (profile?.weight_kg as number | null) ?? null,
    },
    goal,
  );
  const savedRaw = (profile?.nutrition_targets as Targets | null) ?? null;
  const saved = savedRaw && Object.keys(savedRaw).length > 0 ? savedRaw : null;
  const targets = effectiveTargets(saved, suggested);
  const totals = sumMeals(meals);

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <Header />

      {/* Today's totals vs targets */}
      <div className="grid gap-4 lg:grid-cols-4">
        <div className="rounded-2xl border border-line bg-card p-5 lg:col-span-1">
          <span className="text-xs font-semibold uppercase tracking-[0.12em] text-faint">
            Calories today
          </span>
          <p className="mt-3 font-display text-3xl text-ink">
            {totals.calories}
            {targets.calories ? (
              <span className="text-lg text-muted"> / {targets.calories}</span>
            ) : null}
          </p>
          {targets.calories ? (
            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-line">
              <div
                className="h-full rounded-full bg-ember transition-[width] duration-500"
                style={{ width: `${pct(totals.calories, targets.calories)}%` }}
              />
            </div>
          ) : (
            <p className="mt-2 text-xs text-faint">No calorie target set</p>
          )}
        </div>

        <div className="rounded-2xl border border-line bg-card p-5 lg:col-span-3">
          <span className="text-xs font-semibold uppercase tracking-[0.12em] text-faint">
            Macros
          </span>
          <div className="mt-3 grid gap-4 sm:grid-cols-3">
            {MACROS.map((m) => {
              const value = totals[m.key];
              const target = targets[m.key];
              return (
                <div key={m.key}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="flex items-center gap-1.5 text-ink-soft">
                      <span
                        className="inline-block size-2.5 rounded-full"
                        style={{ backgroundColor: m.color }}
                      />
                      {m.label}
                    </span>
                    <span className="text-muted">
                      {value}
                      {target ? ` / ${target}` : ""}g
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-line">
                    <div
                      className="h-full rounded-full transition-[width] duration-500"
                      style={{
                        width: `${pct(value, target)}%`,
                        backgroundColor: m.color,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <DashboardCard title="Goal & daily targets">
        <div className="space-y-5">
          <GoalSelector goal={goal} />
          <div className="border-t border-line pt-5">
            <TargetsEditor saved={saved} suggested={suggested} />
          </div>
        </div>
      </DashboardCard>

      <div className="grid gap-5 lg:grid-cols-5">
        <DashboardCard title="Log a meal" className="lg:col-span-2">
          <MealComposer favorites={favorites} />
        </DashboardCard>

        <DashboardCard title="Logged meals" className="lg:col-span-3">
          <MealDay initial={meals} />
        </DashboardCard>
      </div>
    </div>
  );
}

function Header() {
  return (
    <div>
      <h1 className="font-display text-[2rem] font-normal tracking-tight text-ink">
        Meal
      </h1>
      <p className="mt-1 text-sm text-muted">
        Log what you eat and stay on top of your targets.
      </p>
    </div>
  );
}
