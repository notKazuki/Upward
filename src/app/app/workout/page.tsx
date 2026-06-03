import type { Metadata } from "next";
import Link from "next/link";
import DashboardCard from "@/components/dashboard/card";
import WorkoutForm from "@/components/workout/workout-form";
import SplitChooser from "@/components/workout/split-chooser";
import DayGuide from "@/components/workout/day-guide";
import type { CustomExercise, TrainingGoal } from "@/lib/exercise-guide";
import { createClient } from "@/lib/supabase/server";
import { currentUser } from "@/lib/auth";
import {
  dayColor,
  displayDay,
  formatDate,
  lastByExercise,
  personalRecords,
  splitDisplayName,
  type Workout,
  type WorkoutSet,
} from "@/lib/workouts";
import { serverWeekStart } from "@/lib/server-today";
import { weightUnit, type UnitPref } from "@/lib/onboarding";
import { deleteWorkout } from "./actions";

export const metadata: Metadata = { title: "Workout — Upward" };

/** Group a session's sets by exercise (preserving first-seen order). */
function groupSets(sets: WorkoutSet[]): { exercise: string; sets: WorkoutSet[] }[] {
  const order: string[] = [];
  const map = new Map<string, WorkoutSet[]>();
  for (const s of sets) {
    if (!map.has(s.exercise)) {
      map.set(s.exercise, []);
      order.push(s.exercise);
    }
    map.get(s.exercise)!.push(s);
  }
  return order.map((exercise) => ({ exercise, sets: map.get(exercise)! }));
}

function setLabel(s: WorkoutSet): string {
  if (s.weight != null && s.reps != null) return `${s.weight}×${s.reps}`;
  if (s.reps != null) return `${s.reps}`;
  if (s.weight != null) return `${s.weight}`;
  return "";
}

export default async function WorkoutPage({
  searchParams,
}: {
  searchParams: Promise<{ choose?: string }>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();
  const user = await currentUser();

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("workout_split, workout_split_name, workout_days, unit_pref")
    .eq("id", user!.id)
    .maybeSingle();

  const splitMigrationNeeded = Boolean(profileError);
  const days: string[] = profile?.workout_days ?? [];
  const hasSplit = Boolean(profile?.workout_split) && days.length > 0;
  const choosing = !splitMigrationNeeded && (!hasSplit || sp.choose === "1");

  const { data, error: wErr } = await supabase
    .from("workouts")
    .select("*")
    .order("performed_on", { ascending: false })
    .order("created_at", { ascending: false });
  const tableMissing = Boolean(wErr);
  const workouts = (data ?? []) as Workout[];

  // --- Setup notices -------------------------------------------------
  if (splitMigrationNeeded || tableMissing) {
    return (
      <div className="mx-auto max-w-7xl space-y-5">
        <Header />
        <DashboardCard title="One step left">
          <p className="text-sm leading-relaxed text-muted">
            Run the SQL setup in Supabase → <b>SQL Editor</b>:{" "}
            <code className="text-ink">
              {tableMissing
                ? "supabase/workouts.sql"
                : "supabase/workout-splits.sql"}
            </code>
            , then refresh this page.
          </p>
        </DashboardCard>
      </div>
    );
  }

  // --- Split chooser -------------------------------------------------
  if (choosing) {
    return (
      <div className="mx-auto max-w-7xl">
        <SplitChooser
          current={
            hasSplit ? { id: profile!.workout_split as string, days } : null
          }
        />
      </div>
    );
  }

  // --- Stats ---------------------------------------------------------
  const weekStart = await serverWeekStart();
  const week = workouts.filter((w) => w.performed_on >= weekStart);
  const weekMinutes = week.reduce((s, w) => s + (w.duration_min ?? 0), 0);
  const counts = new Map<string, number>();
  for (const w of workouts)
    counts.set(w.category, (counts.get(w.category) ?? 0) + 1);
  const topDay = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  const stats = [
    { label: "This week", value: `${week.length}`, suffix: "sessions" },
    { label: "Week minutes", value: `${weekMinutes}`, suffix: "logged" },
    { label: "All time", value: `${workouts.length}`, suffix: "sessions" },
    {
      label: "Top day",
      value: topDay ? displayDay(topDay) : "—",
      suffix: "most logged",
    },
  ];

  const splitName = splitDisplayName(
    profile!.workout_split as string,
    (profile!.workout_split_name as string) ?? null,
  );

  // Training goal + custom exercises (fetched tolerantly so a not-yet-run
  // migration degrades gracefully rather than breaking the page).
  const goalRes = await supabase
    .from("profiles")
    .select("training_goal")
    .eq("id", user!.id)
    .maybeSingle();
  const trainingGoal =
    (goalRes.data?.training_goal as TrainingGoal | null) ?? null;

  const ceRes = await supabase
    .from("custom_exercises")
    .select("*")
    .order("created_at", { ascending: true });
  const customByDay: Record<string, CustomExercise[]> = {};
  if (!ceRes.error) {
    for (const c of (ceRes.data ?? []) as CustomExercise[]) {
      (customByDay[c.day_label] ??= []).push(c);
    }
  }

  // Logged sets (newest first) → per-session display, PRs, and prefill.
  const setsRes = await supabase
    .from("workout_sets")
    .select("*")
    .order("created_at", { ascending: false });
  const allSets = (setsRes.error ? [] : (setsRes.data ?? [])) as WorkoutSet[];
  const setsByWorkout: Record<string, WorkoutSet[]> = {};
  for (const s of allSets) (setsByWorkout[s.workout_id] ??= []).push(s);
  // sets within a workout in performed order
  for (const id in setsByWorkout) {
    setsByWorkout[id].sort((a, b) => a.set_index - b.set_index);
  }
  const lastEx = lastByExercise(allSets);
  const prs = personalRecords(allSets).slice(0, 6);
  const unit = weightUnit((profile?.unit_pref as UnitPref | null) ?? "metric");

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <Header
        right={
          <div className="flex items-center gap-3 text-sm">
            <span className="text-muted">
              Split:{" "}
              <span className="font-medium text-ink-soft">{splitName}</span>
            </span>
            <Link
              href="/app/workout?choose=1"
              className="cursor-pointer rounded-full border border-line bg-paper-bright px-3.5 py-1.5 font-medium text-ink-soft transition-colors hover:border-line-strong hover:text-ink"
            >
              Change
            </Link>
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl border border-line bg-card p-5">
            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-faint">
              {s.label}
            </span>
            <p className="mt-3 font-display text-3xl text-ink">{s.value}</p>
            <p className="text-xs text-muted">{s.suffix}</p>
          </div>
        ))}
      </div>

      <DashboardCard title={`${splitName} — day guide`}>
        <DayGuide days={days} goal={trainingGoal} customByDay={customByDay} />
      </DashboardCard>

      {prs.length > 0 && (
        <DashboardCard title="Personal records">
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {prs.map((p) => (
              <li
                key={p.exercise}
                className="flex items-baseline justify-between gap-3 rounded-xl border border-line bg-paper-bright px-4 py-3"
              >
                <span className="min-w-0 truncate text-sm text-ink-soft">{p.exercise}</span>
                <span className="shrink-0 font-display text-lg text-ink">
                  {p.weight}
                  <span className="text-sm text-muted"> {unit}</span>
                  {p.reps != null && (
                    <span className="text-sm text-muted"> × {p.reps}</span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </DashboardCard>
      )}

      <div className="grid gap-5 lg:grid-cols-5">
        <DashboardCard title="Log a workout" className="lg:col-span-2">
          <WorkoutForm
            days={days}
            customByDay={customByDay}
            lastByExercise={lastEx}
            weightUnit={unit}
          />
        </DashboardCard>

        <DashboardCard title="Recent" className="lg:col-span-3">
          {workouts.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 text-center">
              <p className="font-display text-xl text-ink">No workouts yet</p>
              <p className="max-w-xs text-sm text-muted">
                Log your first session on the left — it&rsquo;ll show up here
                right away.
              </p>
            </div>
          ) : (
            <ul className="space-y-2.5">
              {workouts.map((w) => (
                <li
                  key={w.id}
                  className="flex items-start justify-between gap-4 rounded-xl border border-line bg-paper-bright px-4 py-3"
                >
                  <div className="min-w-0">
                    <div className="mb-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs">
                      <span className="inline-flex items-center gap-1.5 font-medium text-ink-soft">
                        <span
                          className="inline-block size-2 rounded-full"
                          style={{ backgroundColor: dayColor(w.category) }}
                        />
                        {displayDay(w.category)}
                      </span>
                      <span className="text-faint">
                        {formatDate(w.performed_on)}
                      </span>
                    </div>
                    <p className="truncate font-medium text-ink">{w.title}</p>
                    {setsByWorkout[w.id]?.length ? (
                      <div className="mt-1 space-y-0.5">
                        {groupSets(setsByWorkout[w.id]).map((g) => (
                          <p key={g.exercise} className="text-xs text-muted">
                            <span className="text-ink-soft">{g.exercise}</span>{" "}
                            {g.sets.map(setLabel).filter(Boolean).join(", ")}
                          </p>
                        ))}
                      </div>
                    ) : null}
                    {w.notes && (
                      <p className="mt-0.5 text-sm leading-relaxed text-muted">
                        {w.notes}
                      </p>
                    )}
                  </div>

                  <div className="flex shrink-0 items-center gap-3">
                    {w.duration_min != null && (
                      <span className="text-sm font-medium text-muted">
                        {w.duration_min}m
                      </span>
                    )}
                    <form action={deleteWorkout}>
                      <input type="hidden" name="id" value={w.id} />
                      <button
                        type="submit"
                        aria-label={`Delete ${w.title}`}
                        className="grid size-8 cursor-pointer place-items-center rounded-lg text-faint transition-colors hover:bg-card hover:text-danger"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M3 6h18M8 6V4h8v2m-9 0 1 14h8l1-14" /></svg>
                      </button>
                    </form>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </DashboardCard>
      </div>
    </div>
  );
}

function Header({ right }: { right?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="font-display text-[2rem] font-normal tracking-tight text-ink">
          Workout
        </h1>
        <p className="mt-1 text-sm text-muted">
          Log your sessions and watch the work add up.
        </p>
      </div>
      {right}
    </div>
  );
}
