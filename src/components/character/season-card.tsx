import Icon from "@/components/icons";
import type { SeasonProgress } from "@/lib/seasons";

function Lock({ color }: { color: string }) {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

export default function SeasonCard({ season }: { season: SeasonProgress }) {
  const { season: s, xp, rewards, nextReward, toNext, trackPct } = season;

  return (
    <div className="u-rise rounded-2xl border border-line bg-card p-6">
      {/* header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-faint">Season</p>
          <h3 className="mt-0.5 font-display text-xl text-ink">{s.name}</h3>
          <p className="mt-1 text-sm text-muted">{s.theme}</p>
        </div>
        <span
          className="shrink-0 rounded-full border px-3 py-1 text-xs font-medium"
          style={{ borderColor: `${s.color}55`, color: s.color, backgroundColor: `${s.color}14` }}
        >
          {s.daysLeft === 0 ? "Final day" : `${s.daysLeft} day${s.daysLeft === 1 ? "" : "s"} left`}
        </span>
      </div>

      {/* season XP track */}
      <div className="mt-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <span className="text-sm text-ink-soft">
            <span className="font-display text-lg text-ink">{xp.toLocaleString()}</span> season XP
          </span>
          <span className="text-xs text-muted">
            {toNext !== null && nextReward
              ? `${toNext.toLocaleString()} XP to ${nextReward.label}`
              : "Track complete — well climbed."}
          </span>
        </div>

        <div className="relative mt-2.5 h-2 w-full rounded-full bg-line">
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-ember transition-[width] duration-700"
            style={{ width: `${trackPct}%` }}
          />
          {rewards.map((r) => (
            <span
              key={r.tier}
              title={`${r.label} · ${r.xp.toLocaleString()} XP`}
              className="absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2"
              style={{
                left: `${r.pct}%`,
                backgroundColor: r.unlocked ? "var(--color-ember)" : "var(--color-card)",
                borderColor: r.unlocked ? "var(--color-ember)" : "var(--color-line)",
              }}
            />
          ))}
        </div>
      </div>

      {/* reward tiers */}
      <ul className="mt-5 grid gap-2 sm:grid-cols-2">
        {rewards.map((r) => (
          <li
            key={r.tier}
            className={`flex items-center gap-3 rounded-xl border p-3 ${
              r.unlocked ? "border-ember/40 bg-ember/5" : "border-line bg-paper-bright/50"
            }`}
          >
            <span
              className="grid size-8 shrink-0 place-items-center rounded-full"
              style={{
                backgroundColor: r.unlocked ? "var(--color-ember)" : "var(--color-paper)",
                color: r.unlocked ? "var(--color-paper)" : "var(--color-faint)",
              }}
            >
              {r.unlocked ? (
                <Icon name="check" size={15} />
              ) : r.pro ? (
                <Lock color="var(--color-faint)" />
              ) : (
                <span className="text-xs font-semibold">{r.tier}</span>
              )}
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1.5">
                <span className={`truncate text-sm ${r.unlocked ? "text-ink" : "text-ink-soft"}`}>{r.label}</span>
                {r.pro && (
                  <span className="shrink-0 rounded-full bg-ember/15 px-1.5 py-0.5 text-[0.6rem] font-bold uppercase tracking-[0.08em] text-ember">
                    Pro
                  </span>
                )}
              </span>
              <span className="text-xs text-faint">{r.xp.toLocaleString()} XP</span>
            </span>
          </li>
        ))}
      </ul>

      {/* footer stats: goal + streak */}
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Stat label="Active days" value={`${season.activeDays}`} sub={`of ${season.goalDays} goal`} bar={season.goalPct} />
        <Stat label="Streak" value={`${season.streak}`} sub={season.streak === 1 ? "day" : "days"} icon />
        <Stat label="Best ever" value={`${season.bestStreak}`} sub={season.bestStreak === 1 ? "day" : "days"} />
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  sub,
  bar,
  icon,
}: {
  label: string;
  value: string;
  sub: string;
  bar?: number;
  icon?: boolean;
}) {
  return (
    <div className="rounded-xl border border-line bg-paper-bright p-3">
      <p className="text-[0.65rem] font-semibold uppercase tracking-[0.1em] text-faint">{label}</p>
      <p className="mt-1 flex items-baseline gap-1.5 font-display text-2xl text-ink">
        {icon && <Icon name="flame" size={18} className="translate-y-0.5 text-ember" />}
        {value}
        <span className="text-xs font-normal text-muted">{sub}</span>
      </p>
      {bar !== undefined && (
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-line">
          <div className="h-full rounded-full bg-ember transition-[width] duration-700" style={{ width: `${bar}%` }} />
        </div>
      )}
    </div>
  );
}
