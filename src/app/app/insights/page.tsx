import type { Metadata } from "next";
import Link from "next/link";
import DashboardCard from "@/components/dashboard/card";
import { ActivityChart } from "@/components/dashboard/charts-lazy";
import ReportView from "@/components/insights/report-view";
import CorrelationsCard from "@/components/insights/correlations-card";
import { createClient } from "@/lib/supabase/server";
import { currentUser } from "@/lib/auth";
import { getProStatus } from "@/lib/pro-data";
import { serverToday } from "@/lib/server-today";
import type { SessionRow, WorkoutRow } from "@/lib/dashboard";
import {
  correlations,
  periodMeta,
  periodStats,
  weeklyTrend,
  windowStart,
  type MealRow,
  type Period,
} from "@/lib/insights";
import { buildReport } from "@/lib/report";
import type { Goal, GoalLog } from "@/lib/goals";
import {
  effectiveTargets,
  suggestTargets,
  type Targets,
} from "@/lib/nutrition";
import type { Gender } from "@/lib/onboarding";

export const metadata: Metadata = { title: "Insights — Upward" };

export default async function InsightsPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const sp = await searchParams;
  const period: Period = sp.period === "90d" ? "90d" : "month";
  const meta = periodMeta(period);

  const supabase = await createClient();
  const user = await currentUser();
  const today = await serverToday();
  const { pro: isPro } = await getProStatus();
  const since = windowStart(today, 98); // cover the 12-week trend + buffer

  const [wRes, sRes, mRes, jRes, suppRes, suppLogRes, goalsRes, goalLogsRes, pRes] =
    await Promise.all([
      supabase
        .from("workouts")
        .select("performed_on, category, duration_min")
        .gte("performed_on", since),
      supabase
        .from("game_sessions")
        .select("game_id, played_on, matches, wins, losses, minutes")
        .gte("played_on", since),
      supabase.from("meals").select("eaten_on, calories, protein").gte("eaten_on", since),
      supabase.from("journal_entries").select("entry_date, mood").gte("entry_date", since),
      supabase.from("supplements").select("id"),
      supabase.from("supplement_logs").select("supplement_id, taken_on").gte("taken_on", since),
      supabase.from("goals").select("*").eq("status", "active"),
      supabase.from("goal_logs").select("*"),
      user
        ? supabase
            .from("profiles")
            .select("dob, gender, height_cm, weight_kg, nutrition_targets")
            .eq("id", user.id)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
    ]);

  const workouts = (wRes.error ? [] : (wRes.data ?? [])) as WorkoutRow[];
  const sessions = (sRes.error ? [] : (sRes.data ?? [])) as SessionRow[];
  const meals = (mRes.error ? [] : (mRes.data ?? [])) as MealRow[];
  const journal = (jRes.error ? [] : (jRes.data ?? [])) as { entry_date: string; mood: string | null }[];
  const supplementsCount = (suppRes.error ? [] : (suppRes.data ?? [])).length;
  const supplementLogs = (suppLogRes.error ? [] : (suppLogRes.data ?? [])) as { taken_on: string; supplement_id: string }[];
  const goals = (goalsRes.error ? [] : (goalsRes.data ?? [])) as Goal[];
  const goalLogs = (goalLogsRes.error ? [] : (goalLogsRes.data ?? [])) as GoalLog[];

  const profile = (pRes.error ? null : pRes.data) as {
    dob?: string | null;
    gender?: string | null;
    height_cm?: number | null;
    weight_kg?: number | null;
    nutrition_targets?: Targets | null;
  } | null;
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

  const periodStart = windowStart(today, meta.days);
  const stats = periodStats(workouts, sessions, meals, periodStart, today, meta.days);
  const trend = weeklyTrend(workouts, sessions, today, 12);
  const insights = correlations(
    workouts,
    sessions,
    meals,
    windowStart(today, 90),
    today,
  );

  const report = buildReport({
    todayStr: today,
    days: meta.days,
    workouts,
    sessions,
    meals,
    calTarget: targets.calories,
    proteinTarget: targets.protein,
    journal,
    supplementsCount,
    supplementLogs,
    goals,
    goalLogs,
  });

  const nothing =
    workouts.length === 0 &&
    sessions.length === 0 &&
    meals.length === 0 &&
    journal.length === 0 &&
    supplementsCount === 0 &&
    goals.length === 0;

  // Every stat names its window so the dashboard's "this week" numbers never
  // look contradictory next to these.
  const win = `${meta.days}d`;
  const cards: { label: string; value: string; suffix: string }[] = [
    { label: "Workouts", value: `${stats.workouts}`, suffix: `${stats.workoutHours}h · last ${win}` },
    {
      label: "Active days",
      value: `${stats.activeDays}`,
      suffix: `${stats.consistencyPct}% of ${stats.days} days`,
    },
    { label: "Matches", value: `${stats.matches}`, suffix: `${stats.gamingHours}h · last ${win}` },
    {
      label: "Win rate",
      value: stats.winRate === null ? "—" : `${stats.winRate}%`,
      suffix: stats.winRate === null ? `no matches in ${win}` : `all games · ${win}`,
    },
    {
      label: "Avg calories",
      value: stats.avgCalories === null ? "—" : stats.avgCalories.toLocaleString(),
      suffix: stats.avgCalories === null ? `no meals in ${win}` : `per logged day · ${win}`,
    },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-[2rem] font-normal tracking-tight text-ink">
            Insights
          </h1>
          <p className="mt-1 text-sm text-muted">
            Patterns across everything you track — the stuff a single tracker can&rsquo;t see.
          </p>
        </div>
        <div className="flex gap-2">
          {(["month", "90d"] as Period[]).map((p) => {
            const on = p === period;
            return (
              <Link
                key={p}
                href={`/app/insights?period=${p}`}
                className={`cursor-pointer rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors ${
                  on
                    ? "border-ember bg-ember/10 text-ink"
                    : "border-line bg-paper-bright text-ink-soft hover:border-ember/50"
                }`}
              >
                {periodMeta(p).label}
              </Link>
            );
          })}
        </div>
      </div>

      {nothing ? (
        <DashboardCard title="Nothing to read yet">
          <div className="flex flex-col items-center gap-2 py-10 text-center">
            <p className="font-display text-xl text-ink">Insights unlock as you log</p>
            <p className="max-w-sm text-sm text-muted">
              Track workouts, gaming, and meals for a couple of weeks and Upward
              will start surfacing how they affect each other here.
            </p>
            <Link
              href="/app/workout"
              className="mt-1 text-sm font-medium text-ember transition-colors hover:text-ink"
            >
              Log something →
            </Link>
          </div>
        </DashboardCard>
      ) : (
        <>
          {/* Cross-system report card */}
          <ReportView report={report} />

          {/* Period stat cards */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
            {cards.map((c) => (
              <div key={c.label} className="rounded-2xl border border-line bg-card p-5">
                <span className="text-xs font-semibold uppercase tracking-[0.12em] text-faint">
                  {c.label}
                </span>
                <p className="mt-3 font-display text-3xl text-ink">{c.value}</p>
                <p className="text-xs text-muted">{c.suffix}</p>
              </div>
            ))}
          </div>

          <div className="grid gap-5 lg:grid-cols-3">
            {/* Trend */}
            <DashboardCard title="Activity trend · last 12 weeks" className="lg:col-span-2">
              <ActivityChart data={trend} />
            </DashboardCard>

            {/* Correlations — the cross-domain depth is Pro; free sees a taste */}
            <DashboardCard title="What the data says">
              <CorrelationsCard insights={insights} isPro={isPro} />
            </DashboardCard>
          </div>
        </>
      )}
    </div>
  );
}
