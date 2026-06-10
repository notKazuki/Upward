import type { Metadata } from "next";
import Link from "next/link";
import DashboardCard from "@/components/dashboard/card";
import RankHero from "@/components/social/rank-hero";
import AchievementBadge from "@/components/social/achievement-badge";
import { getOwnProgress } from "@/lib/progress-data";
import {
  ACHIEVEMENTS,
  achievementProgress,
  type Achievement,
  type AchievementCategory,
} from "@/lib/achievements";

export const metadata: Metadata = { title: "Progress — Upward" };

const CATEGORY_ORDER: AchievementCategory[] = [
  "Training",
  "Nutrition",
  "Mind",
  "Gaming",
  "Goals",
  "Supplements",
  "Social",
  "Rank",
];

export default async function ProgressPage({
  searchParams,
}: {
  searchParams: Promise<{ cat?: string }>;
}) {
  const sp = await searchParams;
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

  // "Nearly there": closest locked, progress-trackable badges.
  const nearly = ACHIEVEMENTS.filter((a) => !earned.has(a.id))
    .map((a) => ({ a, p: achievementProgress(a, progress.stats) }))
    .filter((x): x is { a: Achievement; p: NonNullable<ReturnType<typeof achievementProgress>> } => x.p !== null && x.p.pct > 0)
    .sort((x, y) => y.p.pct - x.p.pct)
    .slice(0, 3);

  const activeCat = CATEGORY_ORDER.find((c) => c === sp.cat) ?? null;
  const cats = activeCat ? [activeCat] : CATEGORY_ORDER;
  const groups = cats
    .map((cat) => ({ category: cat, items: ACHIEVEMENTS.filter((a) => a.category === cat) }))
    .filter((g) => g.items.length > 0);

  const countFor = (cat: AchievementCategory) =>
    ACHIEVEMENTS.filter((a) => a.category === cat && earned.has(a.id)).length;
  const totalFor = (cat: AchievementCategory) =>
    ACHIEVEMENTS.filter((a) => a.category === cat).length;

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <Header />
      <RankHero progress={progress} showToday />

      {nearly.length > 0 && (
        <DashboardCard title="Nearly there">
          <div className="grid gap-3 sm:grid-cols-3">
            {nearly.map(({ a, p }) => (
              <AchievementBadge key={a.id} achievement={a} earned={false} progress={p} />
            ))}
          </div>
        </DashboardCard>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-xl text-ink">Achievements</h2>
        <span className="text-sm text-muted">
          {totalEarned} / {ACHIEVEMENTS.length} earned
        </span>
      </div>

      {/* Category tabs */}
      <div className="flex flex-wrap gap-2">
        <Link
          href="/app/progress"
          className={`cursor-pointer rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors ${
            activeCat === null
              ? "border-ember bg-ember/10 text-ink"
              : "border-line bg-paper-bright text-ink-soft hover:border-ember/50"
          }`}
        >
          All
        </Link>
        {CATEGORY_ORDER.map((c) => (
          <Link
            key={c}
            href={`/app/progress?cat=${c}`}
            className={`cursor-pointer rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors ${
              activeCat === c
                ? "border-ember bg-ember/10 text-ink"
                : "border-line bg-paper-bright text-ink-soft hover:border-ember/50"
            }`}
          >
            {c} <span className="text-faint">{countFor(c)}/{totalFor(c)}</span>
          </Link>
        ))}
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
                progress={earned.has(a.id) ? null : achievementProgress(a, progress.stats)}
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
