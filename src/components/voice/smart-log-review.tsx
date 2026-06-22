"use client";

import { useState } from "react";
import Icon, { type IconName } from "@/components/icons";
import { saveSmartLog, type SmartSaveResult } from "@/app/app/log/smart-actions";
import type { SmartEntry } from "@/lib/smart-log";

const TYPE_META: Record<SmartEntry["type"], { label: string; icon: IconName }> = {
  meal: { label: "Meal", icon: "meal" },
  workout: { label: "Workout", icon: "workout" },
  gaming: { label: "Gaming", icon: "gaming" },
  supplement: { label: "Supplement", icon: "supplement" },
  goal: { label: "Goal", icon: "goals" },
  note: { label: "Note", icon: "journal" },
};

/** FK-backed entry that didn't map to one of the user's tracked rows. */
function isUnmatched(e: SmartEntry): boolean {
  return (
    (e.type === "gaming" || e.type === "supplement" || e.type === "goal") && e.matched === false
  );
}

export default function SmartLogReview({
  entries,
  onDone,
  onCancel,
}: {
  entries: SmartEntry[];
  onDone: (r: SmartSaveResult) => void;
  onCancel: () => void;
}) {
  // Unmatched FK entries can't be saved — start them excluded.
  const [excluded, setExcluded] = useState<Set<number>>(
    () => new Set(entries.map((e, i) => (isUnmatched(e) ? i : -1)).filter((i) => i >= 0)),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const included = entries.filter((_, i) => !excluded.has(i));

  function toggle(i: number) {
    if (isUnmatched(entries[i])) return; // not selectable
    setExcluded((prev) => {
      const n = new Set(prev);
      if (n.has(i)) n.delete(i);
      else n.add(i);
      return n;
    });
  }

  async function save() {
    if (included.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      const r = await saveSmartLog(included);
      if (r.error) {
        setError(r.error);
        return;
      }
      onDone(r);
    } catch {
      setError("Couldn’t save. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="u-rise rounded-2xl border border-line bg-card p-6">
      <div className="flex items-center gap-2">
        <Icon name="sparkle" size={18} className="text-ember" />
        <h3 className="font-display text-lg text-ink">Smart Log · review</h3>
      </div>
      <p className="mt-1 text-sm text-muted">
        Here’s what I caught. Uncheck anything that’s off, then save what’s left.
      </p>

      {entries.length === 0 ? (
        <p className="mt-4 text-sm text-muted">
          I couldn’t pick anything out — try again with a little more detail.
        </p>
      ) : (
        <ul className="mt-4 space-y-2">
          {entries.map((e, i) => (
            <EntryRow
              key={i}
              entry={e}
              included={!excluded.has(i)}
              unmatched={isUnmatched(e)}
              onToggle={() => toggle(i)}
            />
          ))}
        </ul>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={busy || included.length === 0}
          className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-ember px-5 py-2.5 text-sm font-semibold text-paper transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Icon name="check" size={16} />
          {busy ? "Saving…" : `Save ${included.length} ${included.length === 1 ? "entry" : "entries"}`}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          className="cursor-pointer rounded-full border border-line bg-paper-bright px-5 py-2.5 text-sm font-medium text-ink-soft transition-colors hover:border-line-strong hover:text-ink disabled:opacity-60"
        >
          Discard
        </button>
      </div>
      {error && <p className="mt-3 text-sm text-danger">{error}</p>}
    </div>
  );
}

function EntryRow({
  entry,
  included,
  unmatched,
  onToggle,
}: {
  entry: SmartEntry;
  included: boolean;
  unmatched: boolean;
  onToggle: () => void;
}) {
  const meta = TYPE_META[entry.type];
  return (
    <li>
      <button
        type="button"
        onClick={onToggle}
        disabled={unmatched}
        aria-pressed={included}
        className={`flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-colors ${
          unmatched
            ? "cursor-not-allowed border-line bg-paper-bright/30 opacity-50"
            : included
              ? "cursor-pointer border-ember/40 bg-ember/5"
              : "cursor-pointer border-line bg-paper-bright/40 opacity-60"
        }`}
      >
        <span
          className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-md border ${
            included && !unmatched ? "border-ember bg-ember text-paper" : "border-line text-transparent"
          }`}
        >
          <Icon name="check" size={13} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5">
            <Icon name={meta.icon} size={14} className="text-faint" />
            <span className="text-[0.65rem] font-semibold uppercase tracking-[0.1em] text-faint">
              {meta.label}
            </span>
          </span>
          <span className="mt-0.5 block">{summarize(entry)}</span>
          {unmatched && (
            <span className="mt-0.5 block text-xs text-muted">
              Not in your trackers yet — will be skipped.
            </span>
          )}
        </span>
      </button>
    </li>
  );
}

function summarize(e: SmartEntry) {
  if (e.type === "meal") {
    const macros = [
      e.calories !== null ? `${e.calories} kcal` : null,
      e.protein !== null ? `${e.protein}g protein` : null,
    ].filter(Boolean);
    return (
      <>
        <span className="text-sm text-ink">{e.name}</span>
        <span className="text-sm text-muted">
          {" "}
          · {e.mealType}
          {macros.length ? ` · ${macros.join(" · ")}` : ""}
        </span>
      </>
    );
  }
  if (e.type === "workout") {
    return (
      <>
        <span className="text-sm text-ink">{e.title}</span>
        <span className="text-sm text-muted">
          {" "}
          · {e.category}
          {e.durationMin ? ` · ${e.durationMin} min` : ""}
        </span>
        {e.notes && <span className="mt-0.5 block text-xs text-muted">{e.notes}</span>}
      </>
    );
  }
  if (e.type === "gaming") {
    const bits = [
      e.matches !== null ? `${e.matches} match${e.matches === 1 ? "" : "es"}` : null,
      e.wins !== null || e.losses !== null ? `${e.wins ?? 0}W–${e.losses ?? 0}L` : null,
      e.minutes ? `${e.minutes} min` : null,
    ].filter(Boolean);
    return (
      <>
        <span className="text-sm text-ink">{e.game}</span>
        {bits.length > 0 && <span className="text-sm text-muted"> · {bits.join(" · ")}</span>}
      </>
    );
  }
  if (e.type === "supplement") {
    return (
      <>
        <span className="text-sm text-ink">{e.supplement}</span>
        <span className="text-sm text-muted"> · taken today</span>
      </>
    );
  }
  if (e.type === "goal") {
    return (
      <>
        <span className="text-sm text-ink">{e.goal}</span>
        <span className="text-sm text-muted">
          {" "}
          · check-in{e.value !== null ? ` · +${e.value}` : ""}
        </span>
      </>
    );
  }
  return <span className="text-sm text-ink-soft">{e.body}</span>;
}
