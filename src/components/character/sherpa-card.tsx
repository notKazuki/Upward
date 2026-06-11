import Link from "next/link";
import type { SherpaBrief } from "@/lib/sherpa";

export default function SherpaCard({ brief }: { brief: SherpaBrief }) {
  return (
    <div className="u-rise u-glow-border rounded-2xl border border-line bg-card p-6">
      <div className="flex gap-4">
        <Sigil />
        <div className="min-w-0 flex-1">
          <span className="text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-ember">
            The Sherpa
          </span>
          <p className="mt-1 text-sm italic text-muted">{brief.greeting}</p>
          <p className="mt-2 text-[0.95rem] leading-relaxed text-ink-soft">{brief.line}</p>

          {brief.quest && (
            <Link
              href={brief.quest.href}
              className="group mt-4 flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-line bg-paper-bright p-3.5 transition-colors hover:border-ember/50"
            >
              <span className="flex items-center gap-2.5">
                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-ember/15 text-ember">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <circle cx="12" cy="12" r="9" />
                    <circle cx="12" cy="12" r="1.5" fill="currentColor" />
                  </svg>
                </span>
                <span>
                  <span className="block text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-faint">
                    Today&rsquo;s quest
                  </span>
                  <span className="text-sm text-ink">{brief.quest.text}</span>
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

// The Sherpa's sigil — a guide who has reached the summit (peak + flag).
function Sigil() {
  return (
    <div className="grid size-14 shrink-0 place-items-center rounded-full border border-ember/40 bg-ember/10">
      <svg width="30" height="30" viewBox="0 0 48 48" fill="none" aria-hidden>
        <path d="M7 37 L19 17 L26 27 L31 20 L41 37 Z" fill="var(--color-ember)" fillOpacity="0.18" stroke="var(--color-ember)" strokeWidth="2" strokeLinejoin="round" />
        <path d="M19 17 V9" stroke="var(--color-ember)" strokeWidth="2" strokeLinecap="round" />
        <path d="M19 9 L27 11 L19 13 Z" fill="var(--color-ember)" />
      </svg>
    </div>
  );
}
