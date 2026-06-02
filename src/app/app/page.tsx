import type { Metadata } from "next";
import Link from "next/link";
import DashboardCard from "@/components/dashboard/card";
import Icon, { type IconName } from "@/components/icons";
import {
  ActivityChart,
  CategoryChart,
  MacroChart,
  MoodChart,
} from "@/components/dashboard/charts";
import MiniCalendar from "@/components/dashboard/mini-calendar";
import MiniGoals from "@/components/dashboard/mini-goals";
import { generateSummary, stats } from "@/lib/sample-data";

export const metadata: Metadata = {
  title: "Dashboard — Upward",
};

const statCards: {
  label: string;
  value: string;
  suffix: string;
  icon: IconName;
}[] = [
  { label: "Day streak", value: `${stats.streakDays}`, suffix: "days", icon: "flame" },
  {
    label: "Active minutes",
    value: `${stats.workoutMinutesThisWeek}`,
    suffix: "this week",
    icon: "trendUp",
  },
  {
    label: "Supplements",
    value: `${Math.round(stats.supplementAdherence * 100)}%`,
    suffix: "adherence",
    icon: "supplement",
  },
  {
    label: "Goals",
    value: `${stats.goalsDone}/${stats.goalsTotal}`,
    suffix: "complete",
    icon: "goals",
  },
];

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

export default function DashboardPage() {
  const summary = generateSummary();

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <div>
        <h1 className="font-display text-[2rem] font-normal tracking-tight text-ink">
          Dashboard
        </h1>
        <p className="mt-1 text-sm text-muted">
          A calm overview of where you stand.
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {statCards.map((s) => (
          <div
            key={s.label}
            className="rounded-2xl border border-line bg-card p-5"
          >
            <div className="flex items-center gap-2 text-faint">
              <Icon name={s.icon} size={16} />
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
      <div className="grid gap-5 lg:grid-cols-3">
        <DashboardCard title="Your week, summarised" className="lg:col-span-2">
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

        <DashboardCard title="Goals" action={<OpenLink href="/app/goals" />}>
          <MiniGoals />
        </DashboardCard>

        <DashboardCard title="Activity · minutes" className="lg:col-span-2">
          <ActivityChart />
        </DashboardCard>

        <DashboardCard
          title="Calendar"
          action={<OpenLink href="/app/calendar" />}
        >
          <MiniCalendar />
        </DashboardCard>

        <DashboardCard title="Workouts by type">
          <CategoryChart />
        </DashboardCard>

        <DashboardCard title="Macros · grams">
          <MacroChart />
        </DashboardCard>

        <DashboardCard title="Mood · last 7 days">
          <MoodChart />
        </DashboardCard>
      </div>
    </div>
  );
}
