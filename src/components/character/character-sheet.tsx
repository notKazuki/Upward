import ScoreRing, { ringTone } from "@/components/insights/score-ring";
import { ATTR_ACCENT, type Attribute, type AttrId, type Character } from "@/lib/character";
import type { LevelInfo, Rank } from "@/lib/levels";

// Attribute tier rung names (tier 0-5), labelling each Path's depth.
const TIER_NAMES = ["Dormant", "Initiate", "Apprentice", "Adept", "Expert", "Master"];

const ORDER: AttrId[] = ["str", "vit", "focus", "mind", "discipline"];

export default function CharacterSheet({
  character,
  level,
  rank,
}: {
  character: Character;
  level: LevelInfo;
  rank: Rank;
}) {
  const { attributes, power, klass, dominant } = character;
  const byId = new Map(attributes.map((a) => [a.id, a]));
  const ordered = ORDER.map((id) => byId.get(id)!).filter(Boolean);
  const crestColor = dominant ? ATTR_ACCENT[dominant.id] : rank.color;

  return (
    <div className="space-y-5">
      {/* Hero — class crest, name, rank, power */}
      <div className="u-rise rounded-2xl border border-line bg-card p-6">
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-5">
            <Crest color={crestColor} level={level.level} />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span
                  className="rounded-full px-2.5 py-0.5 text-[0.7rem] font-semibold uppercase tracking-[0.12em]"
                  style={{ backgroundColor: `${rank.color}1f`, color: rank.color }}
                >
                  {rank.name}
                </span>
                <span className="text-xs font-semibold uppercase tracking-[0.12em] text-faint">
                  Level {level.level}
                </span>
              </div>
              <h2 className="u-gradient-text mt-1.5 font-display text-[2.1rem] leading-none">
                {klass.name}
              </h2>
              <p className="mt-1.5 text-sm text-muted">{klass.tagline}</p>
            </div>
          </div>

          <div className="flex shrink-0 flex-col items-center gap-1">
            {power !== null ? (
              <ScoreRing value={power} tone={ringTone(power)} size={104} />
            ) : (
              <div className="grid size-[104px] place-items-center rounded-full border border-dashed border-line text-faint">
                <span className="font-display text-2xl">—</span>
              </div>
            )}
            <span className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-faint">
              Power
            </span>
          </div>
        </div>
      </div>

      {/* Radar + attribute paths */}
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="u-rise rounded-2xl border border-line bg-card p-6">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-faint">
            Attributes
          </h3>
          <Radar attributes={ordered} />
        </div>

        <div className="u-rise rounded-2xl border border-line bg-card p-6">
          <h3 className="mb-4 text-xs font-semibold uppercase tracking-[0.12em] text-faint">
            Breakdown
          </h3>
          <ul className="space-y-4">
            {ordered.map((a) => (
              <AttrRow key={a.id} attr={a} />
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

// --- crest emblem ----------------------------------------------------------
function Crest({ color, level }: { color: string; level: number }) {
  return (
    <div className="relative grid size-[88px] shrink-0 place-items-center">
      <div
        className="absolute inset-0 rounded-full opacity-60 blur-md"
        style={{ background: `radial-gradient(circle, ${color}55, transparent 70%)` }}
        aria-hidden
      />
      <div
        className="relative grid size-[88px] place-items-center rounded-full border"
        style={{ borderColor: `${color}66`, background: `${color}14` }}
      >
        <svg width="42" height="42" viewBox="0 0 48 48" fill="none" aria-hidden>
          <path d="M24 8 38 36H10L24 8Z" fill={`${color}22`} stroke={color} strokeWidth="2" strokeLinejoin="round" />
          <path d="M19 26l5-9 5 9" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <span
        className="absolute -bottom-1 grid h-6 min-w-6 place-items-center rounded-full border border-line bg-paper px-1.5 font-display text-xs text-ink"
        style={{ boxShadow: `0 0 0 2px var(--color-card)` }}
      >
        {level}
      </span>
    </div>
  );
}

// --- radar chart -----------------------------------------------------------
function Radar({ attributes }: { attributes: Attribute[] }) {
  const size = 240;
  const c = size / 2;
  const R = 88;
  const labelR = R + 22;

  const pointAt = (i: number, frac: number) => {
    const a = ((-90 + i * 72) * Math.PI) / 180;
    return [c + Math.cos(a) * R * frac, c + Math.sin(a) * R * frac] as const;
  };
  const ringPath = (frac: number) =>
    attributes.map((_, i) => pointAt(i, frac).join(",")).join(" ");
  const dataPath = attributes
    .map((a, i) => pointAt(i, (a.score ?? 0) / 100).join(","))
    .join(" ");
  const hasData = attributes.some((a) => a.score !== null);

  return (
    <div className="relative mx-auto" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* grid rings */}
        {[0.25, 0.5, 0.75, 1].map((f) => (
          <polygon
            key={f}
            points={ringPath(f)}
            fill="none"
            stroke="var(--color-line)"
            strokeWidth={1}
          />
        ))}
        {/* spokes */}
        {attributes.map((_, i) => {
          const [x, y] = pointAt(i, 1);
          return <line key={i} x1={c} y1={c} x2={x} y2={y} stroke="var(--color-line)" strokeWidth={1} />;
        })}
        {/* data polygon */}
        {hasData && (
          <polygon
            points={dataPath}
            fill="var(--color-ember)"
            fillOpacity={0.18}
            stroke="var(--color-ember)"
            strokeWidth={2}
            strokeLinejoin="round"
            style={{ transition: "all 700ms ease" }}
          />
        )}
        {/* vertices */}
        {hasData &&
          attributes.map((a, i) => {
            const [x, y] = pointAt(i, (a.score ?? 0) / 100);
            return <circle key={a.id} cx={x} cy={y} r={3} fill={ATTR_ACCENT[a.id]} />;
          })}
        {/* axis labels */}
        {attributes.map((a, i) => {
          const aRad = ((-90 + i * 72) * Math.PI) / 180;
          const x = c + Math.cos(aRad) * labelR;
          const y = c + Math.sin(aRad) * labelR;
          return (
            <text
              key={a.id}
              x={x}
              y={y}
              textAnchor="middle"
              dominantBaseline="middle"
              className="font-display"
              style={{ fontSize: 12, fill: ATTR_ACCENT[a.id] }}
            >
              {a.abbr}
            </text>
          );
        })}
      </svg>
      {!hasData && (
        <div className="absolute inset-0 grid place-items-center">
          <span className="max-w-[10rem] text-center text-xs text-faint">
            Log activity to map your attributes.
          </span>
        </div>
      )}
    </div>
  );
}

// --- attribute path row ----------------------------------------------------
function AttrRow({ attr }: { attr: Attribute }) {
  const color = ATTR_ACCENT[attr.id];
  const score = attr.score;
  return (
    <li>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="inline-block size-2.5 rounded-full" style={{ backgroundColor: color }} />
          <span className="font-display text-sm text-ink">{attr.label}</span>
          <span className="text-[0.7rem] font-semibold uppercase tracking-[0.1em] text-faint">
            {attr.abbr}
          </span>
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="font-display text-lg text-ink">{score ?? "—"}</span>
          <span className="text-[0.7rem] text-faint">{TIER_NAMES[attr.tier]}</span>
        </div>
      </div>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-line">
        <div
          className="h-full rounded-full transition-[width] duration-700"
          style={{ width: `${score ?? 0}%`, backgroundColor: color }}
        />
      </div>
      {attr.sources.length > 0 && (
        <p className="mt-1.5 text-[0.7rem] text-muted">From {attr.sources.join(" · ")}</p>
      )}
    </li>
  );
}
