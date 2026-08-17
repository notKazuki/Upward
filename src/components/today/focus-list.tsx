import Link from "next/link";
import Icon from "@/components/icons";
import type { FocusBoard, FocusItem } from "@/lib/focus";

/** Today's focus — a calm checklist of the trackers that apply to you, with one
 * gentle "start here" suggestion. Tapping a row jumps you to that logger. */
export default function FocusList({ board }: { board: FocusBoard }) {
  const { items, doneCount, total } = board;
  if (total === 0) return null;
  const allDone = doneCount === total;
  const pct = total ? Math.round((doneCount / total) * 100) : 0;

  return (
    <section className="u-rise u-d2 rounded-2xl border border-line bg-card p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-xl text-ink">Today&rsquo;s focus</h2>
        <span className="text-xs font-semibold uppercase tracking-[0.12em] text-faint">
          {doneCount}/{total} done
        </span>
      </div>

      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-line">
        <div
          className="h-full rounded-full bg-ember transition-[width] duration-700"
          style={{ width: `${pct}%` }}
        />
      </div>

      {allDone && (
        <p className="mt-3 text-sm text-muted">Everything logged today — nicely done.</p>
      )}

      <ul className="mt-4 grid gap-2.5 sm:grid-cols-2">
        {items.map((item) => (
          <FocusRow key={item.key} item={item} />
        ))}
      </ul>
    </section>
  );
}

function FocusRow({ item }: { item: FocusItem }) {
  const { label, icon, href, done, suggested } = item;

  const inner = (
    <>
      <span
        className={`grid size-9 shrink-0 place-items-center rounded-full ${
          done
            ? "bg-ember/15 text-ember"
            : suggested
              ? "bg-ember/10 text-ember"
              : "bg-paper text-muted"
        }`}
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
        {suggested && !done && (
          <span className="text-[0.65rem] font-semibold uppercase tracking-[0.1em] text-ember">
            Start here
          </span>
        )}
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
          suggested
            ? "border-ember/40 bg-ember/5 hover:border-ember/70"
            : "border-line bg-paper-bright hover:border-ember/50"
        }`}
      >
        {inner}
      </Link>
    </li>
  );
}
