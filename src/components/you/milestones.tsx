import {
  ACHIEVEMENTS,
  achievementProgress,
  type Achievement,
  type AchievementStats,
} from "@/lib/achievements";

type Earned = { id: string; earned_on: string };

/** Milestones — the calm replacement for the RPG achievements wall. Shows what
 * you've earned, the most recent unlocks, and the two you're closest to. */
export default function Milestones({
  stats,
  earned,
}: {
  stats: AchievementStats;
  earned: Earned[];
}) {
  const earnedMap = new Map(earned.map((e) => [e.id, e.earned_on]));

  const recent = [...earned]
    .filter((e) => e.earned_on)
    .sort((a, b) => b.earned_on.localeCompare(a.earned_on))
    .slice(0, 3)
    .map((e) => ACHIEVEMENTS.find((a) => a.id === e.id))
    .filter((a): a is Achievement => Boolean(a));

  // Fall back to any earned (dateless) when nothing carries a date yet.
  const shown =
    recent.length > 0
      ? recent
      : earned
          .slice(0, 3)
          .map((e) => ACHIEVEMENTS.find((a) => a.id === e.id))
          .filter((a): a is Achievement => Boolean(a));

  const nearly = ACHIEVEMENTS.filter((a) => !earnedMap.has(a.id))
    .map((a) => ({ a, p: achievementProgress(a, stats) }))
    .filter(
      (x): x is { a: Achievement; p: NonNullable<ReturnType<typeof achievementProgress>> } =>
        x.p !== null && x.p.pct > 0,
    )
    .sort((x, y) => y.p.pct - x.p.pct)
    .slice(0, 2);

  return (
    <section className="rounded-2xl border border-line bg-card p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-xl text-ink">Milestones</h2>
        <span className="text-xs font-semibold uppercase tracking-[0.12em] text-faint">
          {earned.length} / {ACHIEVEMENTS.length}
        </span>
      </div>

      {shown.length === 0 && nearly.length === 0 ? (
        <p className="mt-3 text-sm text-muted">
          Keep logging — your first milestones will show up here.
        </p>
      ) : (
        <div className="mt-4 space-y-4">
          {shown.length > 0 && (
            <div>
              <p className="text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-faint">
                Earned
              </p>
              <ul className="mt-2 space-y-2">
                {shown.map((a) => (
                  <li
                    key={a.id}
                    className="flex items-center gap-3 rounded-xl border border-line bg-paper-bright p-3"
                  >
                    <span className="grid size-8 shrink-0 place-items-center rounded-full bg-ember/15 text-ember">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                        <path d="M20 6 9 17l-5-5" />
                      </svg>
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm text-ink">{a.label}</span>
                      <span className="block truncate text-xs text-muted">{a.description}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {nearly.length > 0 && (
            <div>
              <p className="text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-faint">
                Nearly there
              </p>
              <ul className="mt-2 space-y-2">
                {nearly.map(({ a, p }) => (
                  <li key={a.id} className="rounded-xl border border-line bg-paper-bright p-3">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="truncate text-sm text-ink">{a.label}</span>
                      <span className="shrink-0 text-xs text-muted">
                        {p.current} / {p.target}
                      </span>
                    </div>
                    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-line">
                      <div
                        className="h-full rounded-full bg-ember transition-[width] duration-700"
                        style={{ width: `${p.pct}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
