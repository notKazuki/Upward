"use client";

import { useState } from "react";
import Icon from "@/components/icons";
import { saveSmartLog, type SmartSaveResult } from "@/app/app/log/smart-actions";
import type { SmartEntry } from "@/lib/smart-log";

const TYPE_META: Record<SmartEntry["type"], { label: string; icon: "meal" | "workout" | "journal" }> = {
  meal: { label: "Meal", icon: "meal" },
  workout: { label: "Workout", icon: "workout" },
  note: { label: "Note", icon: "journal" },
};

export default function SmartLogReview({
  entries,
  onDone,
  onCancel,
}: {
  entries: SmartEntry[];
  onDone: (r: SmartSaveResult) => void;
  onCancel: () => void;
}) {
  const [excluded, setExcluded] = useState<Set<number>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const included = entries.filter((_, i) => !excluded.has(i));

  function toggle(i: number) {
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
            <EntryRow key={i} entry={e} included={!excluded.has(i)} onToggle={() => toggle(i)} />
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
  onToggle,
}: {
  entry: SmartEntry;
  included: boolean;
  onToggle: () => void;
}) {
  const meta = TYPE_META[entry.type];
  return (
    <li>
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={included}
        className={`flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-colors ${
          included ? "border-ember/40 bg-ember/5" : "border-line bg-paper-bright/40 opacity-60"
        }`}
      >
        <span
          className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-md border ${
            included ? "border-ember bg-ember text-paper" : "border-line text-transparent"
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
  return <span className="text-sm text-ink-soft">{e.body}</span>;
}
