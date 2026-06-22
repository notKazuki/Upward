import Link from "next/link";
import type { Insight } from "@/lib/insights";

// The cross-domain correlations ("What the data says"). The depth is a Pro
// feature: free users see one as a taste, the rest blurred behind an upgrade.
export default function CorrelationsCard({
  insights,
  isPro,
}: {
  insights: Insight[];
  isPro: boolean;
}) {
  const visible = isPro ? insights : insights.slice(0, 1);
  const locked = isPro ? [] : insights.slice(1);

  return (
    <>
      <ul className="space-y-3">
        {visible.map((ins) => (
          <InsightRow key={ins.id} ins={ins} />
        ))}
      </ul>
      {locked.length > 0 && (
        <div className="relative mt-3">
          <ul className="space-y-3 blur-[5px] select-none" aria-hidden>
            {locked.map((ins) => (
              <InsightRow key={ins.id} ins={ins} />
            ))}
          </ul>
          <div className="absolute inset-0 grid place-items-center p-3">
            <div className="max-w-xs rounded-xl border border-ember/40 bg-card/95 px-4 py-3.5 text-center">
              <p className="text-sm font-medium text-ink">
                {locked.length} more cross-domain pattern{locked.length === 1 ? "" : "s"}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-muted">
                Pro reads the full picture — sleep vs aim, training vs mood, and more.
              </p>
              <Link
                href="/app/upgrade"
                className="mt-2.5 inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-ember px-4 py-2 text-sm font-semibold text-paper transition-opacity hover:opacity-90"
              >
                Unlock with Pro
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function InsightRow({ ins }: { ins: Insight }) {
  return (
    <li className="rounded-xl border border-line bg-paper-bright p-3.5">
      <div className="flex items-center gap-2">
        <span
          className="inline-block size-2 rounded-full"
          style={{
            backgroundColor:
              ins.locked || ins.tone === "neutral"
                ? "var(--color-faint, #a89e8f)"
                : ins.tone === "good"
                  ? "var(--color-ember)"
                  : "var(--color-danger)",
          }}
        />
        <span className="text-xs font-semibold uppercase tracking-[0.1em] text-faint">
          {ins.title}
        </span>
      </div>
      <p className={`mt-1.5 text-sm leading-relaxed ${ins.locked ? "text-faint" : "text-ink-soft"}`}>
        {ins.locked ? ins.hint : ins.detail}
      </p>
    </li>
  );
}
