import Icon from "@/components/icons";
import type { Progress } from "@/lib/progress-data";

/** A calm identity strip for a public profile: level, progress to the next
 * level, and streaks. Replaces the RPG RankHero (no ranks, no Power, no class). */
export default function ProfileLevel({ progress }: { progress: Progress }) {
  const { level, streak } = progress;
  const toNext = Math.max(0, level.span - level.intoLevel);

  return (
    <div className="rounded-2xl border border-line bg-card p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-display text-lg text-ink">Level {level.level}</p>
        <p className="text-sm text-muted">
          {toNext.toLocaleString()} XP to level {level.level + 1}
        </p>
      </div>

      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-line">
        <div
          className="h-full rounded-full bg-ember transition-[width] duration-700"
          style={{ width: `${level.progress}%` }}
        />
      </div>

      <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
        <span className="inline-flex items-center gap-1.5 text-sm text-ink-soft">
          <Icon name="flame" size={15} className="text-ember" />
          {streak.current}-day streak
        </span>
        <span className="inline-flex items-center gap-1.5 text-sm text-muted">
          <Icon name="trophy" size={15} className="text-faint" />
          Best {streak.best}
        </span>
      </div>
    </div>
  );
}
