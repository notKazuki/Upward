import Link from "next/link";
import type { SherpaBrief } from "@/lib/sherpa";

/** The coach's daily read — calm greeting, one observation, one next step. */
export default function CoachBrief({ brief }: { brief: SherpaBrief }) {
  return (
    <div className="u-rise u-glow-border rounded-2xl border border-line bg-card p-6">
      <div className="flex gap-4">
        <Mark />
        <div className="min-w-0 flex-1">
          <span className="text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-ember">
            Your coach
          </span>
          <p className="mt-1 text-sm italic text-muted">{brief.greeting}</p>
          <p className="mt-2 text-[0.95rem] leading-relaxed text-ink-soft">{brief.line}</p>

          {brief.focus && (
            <Link
              href={brief.focus.href}
              className="group mt-4 flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-line bg-paper-bright p-3.5 transition-colors hover:border-ember/50"
            >
              <span className="flex items-center gap-2.5">
                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-ember/15 text-ember">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                </span>
                <span>
                  <span className="block text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-faint">
                    Today&rsquo;s step
                  </span>
                  <span className="text-sm text-ink">{brief.focus.text}</span>
                </span>
              </span>
              <svg
                className="shrink-0 text-faint transition-colors group-hover:text-ember"
                width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden
              >
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

// The coach's mark — a calm four-point spark.
export function Mark({ size = 14 }: { size?: number }) {
  const box = size < 26 ? "size-11" : "size-14";
  const inner = size < 26 ? 24 : 30;
  return (
    <div className={`grid ${box} shrink-0 place-items-center rounded-full border border-ember/40 bg-ember/10`}>
      <svg width={inner} height={inner} viewBox="0 0 24 24" fill="none" stroke="var(--color-ember)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M12 3c.4 3.7 1.3 4.6 5 5-3.7.4-4.6 1.3-5 5-.4-3.7-1.3-4.6-5-5 3.7-.4 4.6-1.3 5-5Z" fill="var(--color-ember)" fillOpacity="0.18" />
        <path d="M18.5 14.5c.2 1.6.6 2 2.2 2.2-1.6.2-2 .6-2.2 2.2-.2-1.6-.6-2-2.2-2.2 1.6-.2 2-.6 2.2-2.2Z" />
      </svg>
    </div>
  );
}
