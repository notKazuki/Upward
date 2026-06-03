import type { Metadata } from "next";
import Link from "next/link";
import DashboardCard from "@/components/dashboard/card";
import { ActivityChart } from "@/components/dashboard/charts-lazy";
import { createClient } from "@/lib/supabase/server";
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
  const today = await serverToday();
  const since = windowStart(today, 98); // cover the 12-week trend + buffer

  const [wRes, sRes, mRes] = await Promise.all([
    supabase
      .from("workouts")
      .select("performed_on, category, duration_min")
      .gte("performed_on", since),
    supabase
      .from("game_sessions")
      .select("game_id, played_on, matches, wins, losses, minutes")
      .gte("played_on", since),
    supabase.from("meals").select("eaten_on, calories, protein").gte("eaten_on", since),
  ]);

  const workouts = (wRes.error ? [] : (wRes.data ?? [])) as WorkoutRow[];
  const sessions = (sRes.error ? [] : (sRes.data ?? [])) as SessionRow[];
  const meals = (mRes.error ? [] : (mRes.data ?? [])) as MealRow[];

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

  const nothing =
    workouts.length === 0 && sessions.length === 0 && meals.length === 0;

  const cards: { label: string; value: string; suffix: string }[] = [
    { label: "Workouts", value: `${stats.workouts}`, suffix: `${stats.workoutHours}h total` },
    {
      label: "Active days",
      value: `${stats.activeDays}`,
      suffix: `${stats.consistencyPct}% of ${stats.days} days`,
    },
    { label: "Matches", value: `${stats.matches}`, suffix: `${stats.gamingHours}h played` },
    {
      label: "Win rate",
      value: stats.winRate === null ? "—" : `${stats.winRate}%`,
      suffix: "across all games",
    },
    {
      label: "Avg calories",
      value: stats.avgCalories === null ? "—" : stats.avgCalories.toLocaleString(),
      suffix: "per logged day",
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

            {/* Correlations */}
            <DashboardCard title="What the data says">
              <ul className="space-y-3">
                {insights.map((ins) => (
                  <li
                    key={ins.id}
                    className="rounded-xl border border-line bg-paper-bright p-3.5"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="inline-block size-2 rounded-full"
                        style={{
                          backgroundColor:
                            ins.locked || ins.tone === "neutral"
                              ? "var(--color-faint, #a89e8f)"
                              : ins.tone === "good"
                                ? "var(--color-ember)"
                                : "var(--color-danger)",
                        }}
                      />
                      <span className="text-xs font-semibold uppercase tracking-[0.1em] text-faint">
                        {ins.title}
                      </span>
                    </div>
                    <p
                      className={`mt-1.5 text-sm leading-relaxed ${
                        ins.locked ? "text-faint" : "text-ink-soft"
                      }`}
                    >
                      {ins.locked ? ins.hint : ins.detail}
                    </p>
                  </li>
                ))}
              </ul>
            </DashboardCard>
          </div>
        </>
      )}
    </div>
  );
}
