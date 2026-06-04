import type { ValMmr } from "@/lib/valorant";

export default function RrCard({ mmr }: { mmr: ValMmr }) {
  const rr = mmr.rr ?? 0;
  const change = mmr.lastChange;
  const changeColor =
    change == null || change === 0 ? "text-muted" : change > 0 ? "text-ember" : "text-danger";
  const changeText =
    change == null ? "" : `${change > 0 ? "+" : ""}${change} RR last game`;

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="font-display text-2xl text-ink">{mmr.tier ?? "Unranked"}</p>
          {mmr.peakTier && (
            <p className="text-xs text-muted">Peak: {mmr.peakTier}</p>
          )}
        </div>
        {mmr.elo != null && (
          <span className="text-sm text-faint">{mmr.elo} elo</span>
        )}
      </div>

      {mmr.gamesNeeded && mmr.gamesNeeded > 0 ? (
        <p className="text-sm text-muted">
          {mmr.gamesNeeded} placement game{mmr.gamesNeeded === 1 ? "" : "s"} left before a rating shows.
        </p>
      ) : (
        <div>
          <div className="mb-1 flex items-center justify-between text-xs">
            <span className="font-medium text-ink-soft">{rr} / 100 RR</span>
            {changeText && <span className={changeColor}>{changeText}</span>}
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-line">
            <div
              className="h-full rounded-full bg-ember transition-[width] duration-500"
              style={{ width: `${Math.max(0, Math.min(100, rr))}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
