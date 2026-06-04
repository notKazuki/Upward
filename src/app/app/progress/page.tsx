import type { Metadata } from "next";
import DashboardCard from "@/components/dashboard/card";
import RankHero from "@/components/social/rank-hero";
import AchievementBadge from "@/components/social/achievement-badge";
import { getOwnProgress } from "@/lib/progress-data";
import { ACHIEVEMENTS, type Achievement } from "@/lib/achievements";

export const metadata: Metadata = { title: "Progress — Upward" };

const CATEGORY_ORDER: Achievement["category"][] = [
  "Training",
  "Nutrition",
  "Mind",
  "Gaming",
  "Goals",
  "Supplements",
  "Social",
  "Rank",
];

export default async function ProgressPage() {
  const progress = await getOwnProgress();

  if (!progress) {
    return (
      <div className="mx-auto max-w-4xl space-y-5">
        <Header />
        <DashboardCard title="One step left">
          <p className="text-sm leading-relaxed text-muted">
            Run <code className="text-ink">supabase/achievements.sql</code> in Supabase →{" "}
            <b>SQL Editor</b> to start earning badges, then refresh.
          </p>
        </DashboardCard>
      </div>
    );
  }

  const earned = new Map(progress.earned.map((e) => [e.id, e.earned_on]));
  const totalEarned = progress.earned.length;

  const groups = CATEGORY_ORDER.map((cat) => ({
    category: cat,
    items: ACHIEVEMENTS.filter((a) => a.category === cat),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <Header />
      <RankHero progress={progress} />

      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl text-ink">Achievements</h2>
        <span className="text-sm text-muted">
          {totalEarned} / {ACHIEVEMENTS.length} earned
        </span>
      </div>

      {groups.map((g) => (
        <DashboardCard key={g.category} title={g.category}>
          <div className="grid gap-3 sm:grid-cols-2">
            {g.items.map((a) => (
              <AchievementBadge
                key={a.id}
                achievement={a}
                earned={earned.has(a.id)}
                earnedOn={earned.get(a.id)}
              />
            ))}
          </div>
        </DashboardCard>
      ))}

      <p className="text-center text-xs leading-relaxed text-muted">
        XP comes from real activity — training, meals, journaling, supplements, goals and gaming —
        capped per day so it can&rsquo;t be farmed. Earning badges grants bonus XP.
      </p>
    </div>
  );
}

function Header() {
  return (
    <div>
      <h1 className="font-display text-[2rem] font-normal tracking-tight text-ink">Progress</h1>
      <p className="mt-1 text-sm text-muted">
        Your level, rank, and the badges you&rsquo;ve earned along the way.
      </p>
    </div>
  );
}
