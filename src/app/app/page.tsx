import type { Metadata } from "next";
import Link from "next/link";
import DashboardCard from "@/components/dashboard/card";
import Icon, { type IconName } from "@/components/icons";
import {
  ActivityChart,
  CategoryChart,
  GamingChart,
} from "@/components/dashboard/charts-lazy";
import MiniCalendar from "@/components/dashboard/mini-calendar";
import { createClient } from "@/lib/supabase/server";
import { currentUser } from "@/lib/auth";
import {
  aggregate,
  statCards,
  type GameRow,
  type SessionRow,
  type WorkoutRow,
} from "@/lib/dashboard";
import { buildSummary } from "@/lib/summary";
import {
  effectiveTargets,
  suggestTargets,
  type Targets,
} from "@/lib/nutrition";
import { serverToday } from "@/lib/server-today";
import {
  currentValue,
  formatValue,
  progressPct,
  type Goal,
  type GoalLog,
} from "@/lib/goals";
import type { Gender } from "@/lib/onboarding";

export const metadata: Metadata = { title: "Dashboard — Upward" };

function isoDaysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

function OpenLink({ href }: { href: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1 text-xs font-medium text-muted transition-colors hover:text-ember"
    >
      Open <Icon name="external" size={14} />
    </Link>
  );
}

const METRIC_LABEL: Record<string, string> = {
  matches: "matches",
  wins: "wins",
  hours: "hours",
};

export default async function DashboardPage() {
  const user = await currentUser();
  const supabase = await createClient();
  const since = isoDaysAgo(56);
  const today = await serverToday();

  const [wRes, sRes, gRes, pRes, mRes, goalsRes, goalLogsRes, suppRes, suppLogRes] =
    await Promise.all([
      supabase
        .from("workouts")
        .select("performed_on, category, duration_min")
        .gte("performed_on", since),
      supabase
        .from("game_sessions")
        .select("game_id, played_on, matches, wins, losses, minutes")
        .gte("played_on", since),
      supabase.from("games").select("id, name, goals"),
      user
        ? supabase
            .from("profiles")
            .select("workout_days, dob, gender, height_cm, weight_kg, nutrition_targets")
            .eq("id", user.id)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      supabase.from("meals").select("calories, protein").eq("eaten_on", today),
      supabase
        .from("goals")
        .select("*")
        .eq("status", "active")
        .order("created_at", { ascending: true }),
      supabase.from("goal_logs").select("*"),
      supabase.from("supplements").select("id"),
      supabase.from("supplement_logs").select("supplement_id").eq("taken_on", today),
    ]);

  const workouts = (wRes.error ? [] : (wRes.data ?? [])) as WorkoutRow[];
  const sessions = (sRes.error ? [] : (sRes.data ?? [])) as SessionRow[];
  const games = (gRes.error ? [] : (gRes.data ?? [])) as GameRow[];

  const profile = (pRes.error ? null : pRes.data) as {
    workout_days?: string[] | null;
    dob?: string | null;
    gender?: string | null;
    height_cm?: number | null;
    weight_kg?: number | null;
    nutrition_targets?: Targets | null;
  } | null;
  const workoutDays = profile?.workout_days ?? [];

  // Nutrition (today's totals vs effective targets)
  const mealsToday = (mRes.error ? [] : (mRes.data ?? [])) as {
    calories: number;
    protein: number;
  }[];
  const caloriesToday = mealsToday.reduce((s, m) => s + (m.calories || 0), 0);
  const proteinToday = mealsToday.reduce((s, m) => s + (m.protein || 0), 0);
  const suggested = suggestTargets({
    dob: profile?.dob ?? null,
    gender: (profile?.gender as Gender | null) ?? null,
    height_cm: profile?.height_cm ?? null,
    weight_kg: profile?.weight_kg ?? null,
  });
  const savedRaw = profile?.nutrition_targets ?? null;
  const targets = effectiveTargets(
    savedRaw && Object.keys(savedRaw).length > 0 ? savedRaw : null,
    suggested,
  );

  const a = aggregate(
    workouts,
    sessions,
    games,
    workoutDays,
    {
      hasMeals: mealsToday.length > 0,
      caloriesToday,
      proteinToday,
      calTarget: targets.calories,
      proteinTarget: targets.protein,
    },
    today,
  );
  const summary = buildSummary(a);
  const cards = statCards(a);

  // General goals (active) with progress.
  const goalsTableMissing = Boolean(goalsRes.error);
  const activeGoals = (goalsRes.error ? [] : (goalsRes.data ?? [])) as Goal[];
  const allGoalLogs = (goalLogsRes.error ? [] : (goalLogsRes.data ?? [])) as GoalLog[];
  const logsByGoal: Record<string, GoalLog[]> = {};
  for (const l of allGoalLogs) (logsByGoal[l.goal_id] ??= []).push(l);
  const goalItems = activeGoals.slice(0, 4).map((g) => {
    const logs = logsByGoal[g.id] ?? [];
    return {
      id: g.id,
      title: g.title,
      pct: progressPct(g, logs),
      label:
        g.type === "binary"
          ? "In progress"
          : `${formatValue(g, currentValue(g, logs))} / ${formatValue(
              g,
              g.target_value ?? 0,
            )}`,
    };
  });

  // Supplements taken today.
  const suppTableMissing = Boolean(suppRes.error);
  const suppIds = new Set(
    (suppRes.error ? [] : (suppRes.data ?? [])).map((s: { id: string }) => s.id),
  );
  const suppTotal = suppIds.size;
  const suppTaken = (suppLogRes.error ? [] : (suppLogRes.data ?? [])).filter(
    (l: { supplement_id: string }) => suppIds.has(l.supplement_id),
  ).length;
  const suppPct = suppTotal ? Math.round((suppTaken / suppTotal) * 100) : 0;

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <div className="u-rise u-d1">
        <h1 className="font-display text-[2rem] font-normal tracking-tight text-ink">
          Dashboard
        </h1>
        <p className="mt-1 text-sm text-muted">
          A calm overview of where you stand.
        </p>
      </div>

      {/* Stat cards */}
      <div className="u-rise u-d2 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {cards.map((s) => (
          <div key={s.label} className="rounded-2xl border border-line bg-card p-5">
            <div className="flex items-center gap-2 text-faint">
              <Icon name={s.icon as IconName} size={16} />
              <span className="text-xs font-semibold uppercase tracking-[0.12em]">
                {s.label}
              </span>
            </div>
            <p className="mt-3 font-display text-3xl text-ink">{s.value}</p>
            <p className="text-xs text-muted">{s.suffix}</p>
          </div>
        ))}
      </div>

      {/* Main grid */}
      <div className="u-rise u-d3 grid gap-5 lg:grid-cols-3">
        <DashboardCard
          title="Your week, summarised"
          className="lg:col-span-2"
          action={<OpenLink href="/app/insights" />}
        >
          <p className="text-lg leading-relaxed text-ink-soft">
            {summary.map((tok, i) =>
              tok.em ? (
                <span key={i} className="font-medium text-ember">
                  {tok.t}
                </span>
              ) : (
                <span key={i}>{tok.t}</span>
              ),
            )}
          </p>
        </DashboardCard>

        {/* Gaming weekly goals */}
        <DashboardCard title="Gaming goals" action={<OpenLink href="/app/gaming" />}>
          {a.goalProgress.length === 0 ? (
            <div className="flex h-full flex-col justify-center gap-2 py-6 text-center">
              <p className="text-sm text-muted">
                No goals set yet. Add weekly targets in a game to track them here.
              </p>
              <Link
                href="/app/gaming"
                className="text-sm font-medium text-ember transition-colors hover:text-ink"
              >
                Set goals →
              </Link>
            </div>
          ) : (
            <ul className="space-y-3">
              {a.goalProgress.slice(0, 5).map((g, i) => (
                <li key={i}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="text-ink-soft">
                      {g.game}{" "}
                      <span className="text-faint">· {METRIC_LABEL[g.metric]}</span>
                    </span>
                    <span className="text-muted">
                      {g.value}
                      {g.metric === "hours" ? "h" : ""} / {g.target}
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-line">
                    <div
                      className="h-full rounded-full bg-ember transition-[width] duration-500"
                      style={{ width: `${g.pct}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </DashboardCard>

        {/* Goals (general) */}
        {!goalsTableMissing && (
          <DashboardCard title="Goals" action={<OpenLink href="/app/goals" />}>
            {goalItems.length === 0 ? (
              <div className="flex h-full flex-col justify-center gap-2 py-6 text-center">
                <p className="text-sm text-muted">
                  No goals yet. Set one and track the journey here.
                </p>
                <Link
                  href="/app/goals"
                  className="text-sm font-medium text-ember transition-colors hover:text-ink"
                >
                  Set a goal →
                </Link>
              </div>
            ) : (
              <ul className="space-y-3">
                {goalItems.map((g) => (
                  <li key={g.id}>
                    <div className="mb-1 flex justify-between gap-3 text-sm">
                      <span className="truncate text-ink-soft">{g.title}</span>
                      <span className="shrink-0 text-muted">{g.label}</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-line">
                      <div
                        className="h-full rounded-full bg-ember transition-[width] duration-500"
                        style={{ width: `${g.pct}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </DashboardCard>
        )}

        {/* Activity */}
        <DashboardCard title="Activity · minutes" className="lg:col-span-2">
          {a.hasAny ? (
            <ActivityChart data={a.perDayMinutes} />
          ) : (
            <EmptyChart label="Log a session to see your week take shape." />
          )}
        </DashboardCard>

        {/* Calendar */}
        <DashboardCard title="Calendar" action={<OpenLink href="/app/calendar" />}>
          <MiniCalendar activeDays={a.activeDaysThisMonth} />
        </DashboardCard>

        {/* Supplements today */}
        {!suppTableMissing && (
          <DashboardCard
            title="Supplements today"
            action={<OpenLink href="/app/supplement" />}
          >
            {suppTotal === 0 ? (
              <div className="flex h-full flex-col justify-center gap-2 py-6 text-center">
                <p className="text-sm text-muted">
                  Build your daily stack and check it off here.
                </p>
                <Link
                  href="/app/supplement"
                  className="text-sm font-medium text-ember transition-colors hover:text-ink"
                >
                  Add supplements →
                </Link>
              </div>
            ) : (
              <div className="flex h-full flex-col justify-center">
                <p className="font-display text-3xl text-ink">
                  {suppTaken}
                  <span className="text-lg text-muted"> / {suppTotal} taken</span>
                </p>
                <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-line">
                  <div
                    className="h-full rounded-full bg-ember transition-[width] duration-500"
                    style={{ width: `${suppPct}%` }}
                  />
                </div>
              </div>
            )}
          </DashboardCard>
        )}

        {/* Workouts by type (only if any) */}
        {a.hasWorkouts && a.workoutsByCategory.length > 0 && (
          <DashboardCard title="Workouts by type">
            <CategoryChart data={a.workoutsByCategory} />
          </DashboardCard>
        )}

        {/* Gaming matches (only if any) */}
        {a.hasGaming && a.matchesByGame.length > 0 && (
          <DashboardCard title="Matches by game">
            <GamingChart data={a.matchesByGame} />
          </DashboardCard>
        )}
      </div>
    </div>
  );
}

function EmptyChart({ label }: { label: string }) {
  return (
    <div className="flex h-[240px] flex-col items-center justify-center gap-2 text-center">
      <p className="max-w-xs text-sm text-muted">{label}</p>
    </div>
  );
}
