import type { Progress } from "@/lib/progress-data";

function LevelRing({ level, progress, color }: { level: number; progress: number; color: string }) {
  const size = 104;
  const stroke = 9;
  const r = (size - stroke) / 2 - 1;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - progress / 100);
  return (
    <div className="relative grid shrink-0 place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-line)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 700ms ease" }}
        />
      </svg>
      <div className="absolute flex flex-col items-center leading-none">
        <span className="text-[0.6rem] font-semibold uppercase tracking-[0.14em] text-faint">Level</span>
        <span className="font-display text-3xl text-ink">{level}</span>
      </div>
    </div>
  );
}

export default function RankHero({ progress, name }: { progress: Progress; name?: string }) {
  const { level, rank, next, xp } = progress;
  const levelsToNext = next ? next.minLevel - level.level : 0;

  return (
    <div className="rounded-2xl border border-line bg-card p-6">
      <div className="flex flex-col items-center gap-5 sm:flex-row">
        <LevelRing level={level.level} progress={level.progress} color={rank.color} />
        <div className="min-w-0 flex-1 text-center sm:text-left">
          <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
            <span
              className="rounded-full px-3 py-0.5 text-sm font-semibold"
              style={{ backgroundColor: `${rank.color}22`, color: rank.color }}
            >
              {rank.name}
            </span>
            {name && <span className="text-sm text-muted">{name}</span>}
          </div>
          <p className="mt-2 font-display text-2xl text-ink">{xp.toLocaleString()} XP</p>
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-line">
            <div
              className="h-full rounded-full transition-[width] duration-700"
              style={{ width: `${level.progress}%`, backgroundColor: rank.color }}
            />
          </div>
          <p className="mt-1.5 text-xs text-muted">
            {level.intoLevel.toLocaleString()} / {level.span.toLocaleString()} XP to level {level.level + 1}
            {next && levelsToNext > 0 && (
              <> · {levelsToNext} to <span className="font-medium text-ink-soft">{next.name}</span></>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
