import { RANKS, type LevelInfo } from "@/lib/levels";

// Waypoint positions along the trail (viewBox 0..100 x, 0..58 y; lower y = higher
// up the mountain). One per rank, Base Camp (bottom-left) → Peak (top-right).
const WP: [number, number][] = [
  [6, 50],
  [20, 45],
  [33, 38],
  [47, 31],
  [61, 24],
  [76, 15],
  [93, 6],
];

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const pts = (arr: [number, number][]) => arr.map(([x, y]) => `${x},${y}`).join(" ");

export default function Ascent({ level }: { level: LevelInfo }) {
  const lvl = level.level;

  let ci = 0;
  RANKS.forEach((r, i) => {
    if (lvl >= r.minLevel) ci = i;
  });
  const cur = RANKS[ci];
  const nxt = RANKS[ci + 1] ?? null;
  const frac = nxt ? Math.min(1, Math.max(0, (lvl - cur.minLevel) / (nxt.minLevel - cur.minLevel))) : 1;
  const pct = Math.round(frac * 100);

  const climber: [number, number] = nxt
    ? [lerp(WP[ci][0], WP[ci + 1][0], frac), lerp(WP[ci][1], WP[ci + 1][1], frac)]
    : WP[WP.length - 1];
  const climbed = [...WP.slice(0, ci + 1), climber];

  return (
    <div className="u-rise rounded-2xl border border-line bg-card p-6">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-faint">The Ascent</h3>
        <span className="text-xs text-muted">
          Level {lvl} ·{" "}
          <span style={{ color: cur.color }} className="font-medium">
            {cur.name}
          </span>
        </span>
      </div>

      <svg viewBox="0 0 100 58" className="w-full" role="img" aria-label={`Level ${lvl}, ${cur.name}${nxt ? `, ${pct}% to ${nxt.name}` : ", Peak reached"}`}>
        {/* mountain silhouettes — subtle, cross-theme via ink opacity */}
        <polygon points="0,58 16,38 28,46 42,28 56,40 72,20 86,34 100,12 100,58" fill="var(--color-ink)" opacity="0.04" />
        <polygon points="0,58 20,47 34,51 50,38 66,48 82,32 100,42 100,58" fill="var(--color-ink)" opacity="0.06" />

        {/* future trail (full path, faint) */}
        <polyline points={pts(WP)} fill="none" stroke="var(--color-line)" strokeWidth="0.7" strokeDasharray="1.4 1.6" strokeLinecap="round" />
        {/* climbed trail (lit, glowing) */}
        <polyline
          points={pts(climbed)}
          fill="none"
          stroke="var(--color-ember)"
          strokeWidth="1.3"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ filter: "drop-shadow(0 0 1.5px var(--color-ember))" }}
        />

        {/* waypoints */}
        {RANKS.map((r, i) => {
          const [x, y] = WP[i];
          const reached = lvl >= r.minLevel;
          const isCurrent = i === ci;
          return (
            <g key={r.id}>
              {isCurrent && <circle cx={x} cy={y} r={3.2} fill="none" stroke={r.color} strokeWidth="0.5" opacity="0.5" />}
              <circle
                cx={x}
                cy={y}
                r={1.7}
                fill={reached ? r.color : "var(--color-card)"}
                stroke={reached ? r.color : "var(--color-line)"}
                strokeWidth="0.6"
              />
              <text
                x={x}
                y={y + 4.6}
                textAnchor="middle"
                style={{ fontSize: 2.3, fill: isCurrent ? r.color : "var(--color-faint)", fontWeight: isCurrent ? 600 : 400 }}
              >
                {r.name}
              </text>
            </g>
          );
        })}

        {/* climber */}
        <circle cx={climber[0]} cy={climber[1]} r={3.4} fill="var(--color-ember)" opacity="0.22" />
        <circle cx={climber[0]} cy={climber[1]} r={1.7} fill="var(--color-ember)" stroke="var(--color-paper)" strokeWidth="0.5" />
      </svg>

      <p className="mt-2 text-center text-sm text-muted">
        {nxt ? (
          <>
            <span className="font-medium text-ink">{pct}%</span> to{" "}
            <span style={{ color: nxt.color }} className="font-medium">
              {nxt.name}
            </span>
          </>
        ) : (
          <span className="font-medium text-ink">The Peak — there is no higher.</span>
        )}
      </p>
    </div>
  );
}
