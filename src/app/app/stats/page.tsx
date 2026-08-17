import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import DashboardCard from "@/components/dashboard/card";
import LevelStrip from "@/components/dashboard/level-strip";
import Milestones from "@/components/you/milestones";
import MiniCalendar from "@/components/dashboard/mini-calendar";
import Icon, { type IconName } from "@/components/icons";
import { getOwnProgress } from "@/lib/progress-data";

export const metadata: Metadata = { title: "You — Upward" };

// "You" — your level, your streaks, your real numbers and milestones. The
// header paints immediately; the derived progress (a wide read across every
// tracker) streams in behind it.
export default function YouPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Header />
      <Suspense fallback={<YouSkeleton />}>
        <YouBody />
      </Suspense>
    </div>
  );
}

function YouSkeleton() {
  return (
    <div className="space-y-5" aria-hidden>
      <div className="h-[104px] animate-pulse rounded-2xl border border-line bg-card" />
      <div className="grid grid-cols-2 gap-4">
        <div className="h-[124px] animate-pulse rounded-2xl border border-line bg-card" />
        <div className="h-[124px] animate-pulse rounded-2xl border border-line bg-card" />
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-[124px] animate-pulse rounded-2xl border border-line bg-card" />
        ))}
      </div>
      <div className="h-[220px] animate-pulse rounded-2xl border border-line bg-card" />
    </div>
  );
}

async function YouBody() {
  const progress = await getOwnProgress();

  if (!progress) {
    return (
      <DashboardCard title="Nothing to show yet">
        <div className="flex flex-col items-center gap-2 py-8 text-center">
          <p className="max-w-sm text-sm text-muted">
            Log a workout, a meal or a match and your numbers will start to fill in here.
          </p>
          <Link href="/app" className="text-sm font-medium text-ember transition-colors hover:text-ink">
            Log your day →
          </Link>
        </div>
      </DashboardCard>
    );
  }

  const s = progress.stats;
  const cards: { label: string; value: string; sub: string; icon: IconName }[] = [
    { label: "Workouts", value: `${s.workouts}`, sub: "all time", icon: "workout" },
    { label: "Meals logged", value: `${s.mealDaysLogged}`, sub: "days", icon: "meal" },
    {
      label: "Matches",
      value: `${s.gamingMatches}`,
      sub: s.gamingWinRate !== null ? `${s.gamingWinRate}% win rate` : "played",
      icon: "gaming",
    },
    { label: "Journal", value: `${s.journalEntries}`, sub: "entries", icon: "journal" },
    { label: "Goals done", value: `${s.goalsCompleted}`, sub: "completed", icon: "goals" },
    { label: "Perfect stacks", value: `${s.supplementPerfectDays}`, sub: "days", icon: "supplement" },
  ];

  return (
    <div className="space-y-5">
      <LevelStrip level={progress.level} />

      {/* Streaks */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-2xl border border-line bg-card p-5">
          <div className="flex items-center gap-2 text-faint">
            <Icon name="flame" size={16} />
            <span className="text-xs font-semibold uppercase tracking-[0.12em]">Current streak</span>
          </div>
          <p className="mt-3 font-display text-3xl text-ink">{progress.streak.current}</p>
          <p className="text-xs text-muted">days in a row</p>
        </div>
        <div className="rounded-2xl border border-line bg-card p-5">
          <div className="flex items-center gap-2 text-faint">
            <Icon name="trophy" size={16} />
            <span className="text-xs font-semibold uppercase tracking-[0.12em]">Best streak</span>
          </div>
          <p className="mt-3 font-display text-3xl text-ink">{progress.streak.best}</p>
          <p className="text-xs text-muted">personal record</p>
        </div>
      </div>

      {/* All-time numbers */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {cards.map((c) => (
          <div key={c.label} className="u-rise rounded-2xl border border-line bg-card p-5">
            <div className="flex items-center gap-2 text-faint">
              <Icon name={c.icon} size={16} />
              <span className="text-xs font-semibold uppercase tracking-[0.12em]">{c.label}</span>
            </div>
            <p className="mt-3 font-display text-3xl text-ink">{c.value}</p>
            <p className="text-xs text-muted">{c.sub}</p>
          </div>
        ))}
      </div>

      <Milestones stats={progress.stats} earned={progress.earned} />

      {/* History */}
      <DashboardCard
        title="This month"
        action={
          <Link
            href="/app/calendar"
            className="inline-flex items-center gap-1 text-xs font-medium text-muted transition-colors hover:text-ember"
          >
            Full history <Icon name="external" size={14} />
          </Link>
        }
      >
        <MiniCalendar activeDays={activeDaysThisMonth(progress.activeDates)} />
      </DashboardCard>
    </div>
  );
}

/** This month's active day-numbers, for the mini calendar. */
function activeDaysThisMonth(dates: string[]): number[] {
  const now = new Date();
  const prefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-`;
  return dates
    .filter((d) => d.startsWith(prefix))
    .map((d) => Number(d.slice(8, 10)))
    .filter((n) => Number.isFinite(n));
}

function Header() {
  return (
    <div>
      <h1 className="font-display text-[2rem] font-normal tracking-tight text-ink">You</h1>
      <p className="mt-1 text-sm text-muted">Your level, streaks and everything you&rsquo;ve logged.</p>
    </div>
  );
}
