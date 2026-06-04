import Icon, { type IconName } from "@/components/icons";
import type { Report, Tone } from "@/lib/report";
import ScoreRing, { ringTone as overallTone } from "./score-ring";

const BAR: Record<Tone, string> = {
  good: "bg-ember",
  okay: "bg-[#c9a23f]",
  bad: "bg-danger",
};
const TEXT: Record<Tone, string> = {
  good: "text-ember",
  okay: "text-[#c9a23f]",
  bad: "text-danger",
};

export default function ReportView({ report }: { report: Report }) {
  const { overall } = report;

  return (
    <div className="space-y-5">
      {/* Hero scorecard */}
      <div className="rounded-2xl border border-line bg-card p-6">
        <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center">
          {overall !== null && <ScoreRing value={overall} tone={overallTone(overall)} />}
          <div className="min-w-0 text-center sm:text-left">
            <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-faint">
                Overall
              </span>
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                  overall !== null ? `bg-paper ${TEXT[overallTone(overall)]}` : "bg-paper text-muted"
                }`}
              >
                {report.grade}
              </span>
            </div>
            <p className="mt-2 font-display text-2xl leading-snug text-ink">{report.headline}</p>
            <p className="mt-1 text-sm text-muted">
              Scored across {report.domains.length} area{report.domains.length === 1 ? "" : "s"} you track.
            </p>
          </div>
        </div>
      </div>

      {/* Domain scores */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {report.domains.map((d) => (
          <div key={d.id} className="rounded-2xl border border-line bg-card p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-ink-soft">
                <Icon name={d.icon as IconName} size={17} />
                <span className="font-medium">{d.label}</span>
              </div>
              <span className={`font-display text-2xl ${TEXT[d.tone]}`}>{d.score}</span>
            </div>
            <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-line">
              <div
                className={`h-full rounded-full ${BAR[d.tone]} transition-[width] duration-700`}
                style={{ width: `${d.score}%` }}
              />
            </div>
            <p className="mt-3 text-sm text-ink-soft">{d.summary}</p>
            <ul className="mt-2 space-y-1">
              {d.facts.map((f, i) => (
                <li key={i} className="text-xs leading-relaxed text-muted">
                  {f}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Strengths vs focus */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-line bg-card p-5">
          <div className="mb-3 flex items-center gap-2">
            <span className="grid size-6 place-items-center rounded-full bg-ember/15 text-ember">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M20 6 9 17l-5-5" /></svg>
            </span>
            <h3 className="font-display text-lg text-ink">What&rsquo;s working</h3>
          </div>
          {report.strengths.length === 0 ? (
            <p className="text-sm text-muted">Log a bit more and your wins will show up here.</p>
          ) : (
            <ul className="space-y-2.5">
              {report.strengths.map((p, i) => (
                <li key={i} className="flex gap-2.5 text-sm leading-relaxed text-ink-soft">
                  <span className="mt-1.5 inline-block size-1.5 shrink-0 rounded-full bg-ember" />
                  <span>
                    <span className="font-medium text-ink">{p.domain}.</span> {p.text}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-2xl border border-line bg-card p-5">
          <div className="mb-3 flex items-center gap-2">
            <span className="grid size-6 place-items-center rounded-full bg-danger/15 text-danger">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M12 9v4m0 4h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" /></svg>
            </span>
            <h3 className="font-display text-lg text-ink">Where to focus</h3>
          </div>
          {report.focus.length === 0 ? (
            <p className="text-sm text-muted">Nothing flagged — keep it up.</p>
          ) : (
            <ul className="space-y-2.5">
              {report.focus.map((p, i) => (
                <li key={i} className="flex gap-2.5 text-sm leading-relaxed text-ink-soft">
                  <span className="mt-1.5 inline-block size-1.5 shrink-0 rounded-full bg-danger" />
                  <span>
                    <span className="font-medium text-ink">{p.domain}.</span> {p.text}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
