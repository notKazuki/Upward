import type { Tone } from "@/lib/report";

const RING: Record<Tone, string> = {
  good: "var(--color-ember)",
  okay: "#c9a23f",
  bad: "var(--color-danger)",
};

export function ringTone(n: number): Tone {
  return n >= 67 ? "good" : n >= 45 ? "okay" : "bad";
}

/** Circular score gauge (0-100). Sized by `size` px. */
export default function ScoreRing({
  value,
  tone,
  size = 128,
}: {
  value: number;
  tone: Tone;
  size?: number;
}) {
  const stroke = size * 0.078;
  const r = (size - stroke) / 2 - 1;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - value / 100);
  const big = size >= 100;
  return (
    <div className="relative grid shrink-0 place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-line)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={RING[tone]}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 700ms ease" }}
        />
      </svg>
      <div className="absolute flex flex-col items-center leading-none">
        <span className={`font-display text-ink ${big ? "text-4xl" : "text-xl"}`}>{value}</span>
        {big && (
          <span className="mt-0.5 text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-faint">
            / 100
          </span>
        )}
      </div>
    </div>
  );
}
