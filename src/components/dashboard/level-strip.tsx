import type { LevelInfo } from "@/lib/levels";

// A clean level / XP progress bar — the classic-mode equivalent of the gamified
// Ascent. Keeps levels and XP (the user asked for these) without any RPG
// framing (no class, Power, attributes or mountain ranks).
export default function LevelStrip({ level }: { level: LevelInfo }) {
  const toNext = Math.max(0, level.span - level.intoLevel);
  return (
    <div className="u-rise rounded-2xl border border-line bg-card p-5">
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
      <p className="mt-2 text-xs text-faint">{level.xp.toLocaleString()} total XP earned</p>
    </div>
  );
}
