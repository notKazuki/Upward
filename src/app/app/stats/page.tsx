import type { Metadata } from "next";
import Link from "next/link";
import DashboardCard from "@/components/dashboard/card";
import LevelStrip from "@/components/dashboard/level-strip";
import Icon, { type IconName } from "@/components/icons";
import { getOwnProgress } from "@/lib/progress-data";

export const metadata: Metadata = { title: "Stats — Upward" };

// The classic-mode overview: real numbers and a level, no RPG framing. (The
// gamified Character sheet lives at /app/character; this is its calm sibling.)
export default async function StatsPage() {
  const progress = await getOwnProgress();

  if (!progress) {
    return (
      <div className="mx-auto max-w-5xl space-y-5">
        <Header />
        <DashboardCard title="Nothing to show yet">
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <p className="max-w-sm text-sm text-muted">
              Log a workout, a meal or a match and your stats will start to fill in here.
            </p>
            <Link href="/app/log" className="text-sm font-medium text-ember transition-colors hover:text-ink">
              Quick log →
            </Link>
          </div>
        </DashboardCard>
      </div>
    );
  }

  const s = progress.stats;
  const cards: { label: string; value: string; sub: string; icon: IconName }[] = [
    {
      label: "Day streak",
      value: `${progress.streak.current}`,
      sub: `best ${progress.streak.best}`,
      icon: "flame",
    },
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
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <Header />
      <LevelStrip level={progress.level} />
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
    </div>
  );
}

function Header() {
  return (
    <div>
      <h1 className="font-display text-[2rem] font-normal tracking-tight text-ink">Stats</h1>
      <p className="mt-1 text-sm text-muted">Your numbers at a glance.</p>
    </div>
  );
}
