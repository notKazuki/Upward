import Link from "next/link";
import Icon from "@/components/icons";
import type { Quest, QuestBoard } from "@/lib/quests";

export default function DailyQuests({ board }: { board: QuestBoard }) {
  const { quests, doneCount, total, xpEarned, xpTotal } = board;
  if (total === 0) return null;
  const allDone = doneCount === total;
  const pct = xpTotal ? Math.round((xpEarned / xpTotal) * 100) : 0;

  return (
    <div className="u-rise u-d2 rounded-2xl border border-line bg-card p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-baseline gap-2.5">
          <h2 className="font-display text-xl text-ink">Today&rsquo;s quests</h2>
          <span className="text-xs font-semibold uppercase tracking-[0.12em] text-faint">
            {doneCount}/{total}
          </span>
        </div>
        <span className="text-xs text-muted">
          {allDone ? "All cleared — well climbed." : `${xpEarned} / ${xpTotal} XP`}
        </span>
      </div>

      {/* XP progress for the day */}
      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-line">
        <div
          className="h-full rounded-full bg-ember transition-[width] duration-700"
          style={{ width: `${pct}%` }}
        />
      </div>

      <ul className="mt-4 grid gap-2.5 sm:grid-cols-2">
        {quests.map((q) => (
          <QuestRow key={q.key} quest={q} />
        ))}
      </ul>
    </div>
  );
}

function QuestRow({ quest }: { quest: Quest }) {
  const { label, color, icon, href, xp, done, focus } = quest;

  const inner = (
    <>
      <span
        className="grid size-9 shrink-0 place-items-center rounded-full"
        style={{ backgroundColor: done ? `${color}26` : `${color}1a`, color }}
      >
        {done ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M20 6 9 17l-5-5" />
          </svg>
        ) : (
          <Icon name={icon} size={16} />
        )}
      </span>

      <span className="min-w-0 flex-1">
        <span className={`block truncate text-sm ${done ? "text-muted line-through" : "text-ink"}`}>
          {label}
        </span>
        {focus && !done && (
          <span className="text-[0.65rem] font-semibold uppercase tracking-[0.1em] text-ember">
            Sherpa&rsquo;s focus
          </span>
        )}
      </span>

      <span className={`shrink-0 text-xs font-semibold ${done ? "text-faint" : "text-faint"}`}>
        +{xp}
      </span>
    </>
  );

  const base = "flex items-center gap-3 rounded-xl border p-3 transition-colors";

  if (done) {
    return <li className={`${base} border-line bg-paper-bright/50`}>{inner}</li>;
  }
  return (
    <li>
      <Link
        href={href}
        className={`${base} cursor-pointer ${
          focus ? "border-ember/40 bg-ember/5 hover:border-ember/70" : "border-line bg-paper-bright hover:border-ember/50"
        }`}
      >
        {inner}
      </Link>
    </li>
  );
}
