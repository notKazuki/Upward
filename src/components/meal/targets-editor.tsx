"use client";

import { useState, useTransition } from "react";
import { updateTargets } from "@/app/app/meal/actions";
import { effectiveTargets, type Targets } from "@/lib/nutrition";

const FIELDS: { key: keyof Targets; label: string; unit: string }[] = [
  { key: "calories", label: "Calories", unit: "kcal" },
  { key: "protein", label: "Protein", unit: "g" },
  { key: "carbs", label: "Carbs", unit: "g" },
  { key: "fat", label: "Fat", unit: "g" },
];

export default function TargetsEditor({
  saved,
  suggested,
}: {
  saved: Targets | null;
  suggested: Targets | null;
}) {
  const effective = effectiveTargets(saved, suggested);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Targets>(effective);
  const [pending, startTransition] = useTransition();

  function save() {
    startTransition(async () => {
      await updateTargets(draft);
      setEditing(false);
    });
  }

  if (editing) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {FIELDS.map((f) => (
            <label key={f.key} className="flex flex-col gap-1">
              <span className="text-xs text-muted">
                {f.label} <span className="text-faint">({f.unit})</span>
              </span>
              <input
                type="number"
                min={0}
                value={draft[f.key] ?? ""}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    [f.key]:
                      e.target.value === "" ? undefined : Number(e.target.value),
                  }))
                }
                placeholder="—"
                className="rounded-lg border border-line bg-paper-bright px-3 py-2 text-sm text-ink placeholder:text-faint focus:border-ember focus:outline-none"
              />
            </label>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={save}
            disabled={pending}
            className="cursor-pointer rounded-full bg-ink px-5 py-2 text-sm font-medium text-paper-bright transition-colors hover:bg-ink-soft disabled:opacity-70"
          >
            {pending ? "Saving…" : "Save targets"}
          </button>
          {suggested && (
            <button
              type="button"
              onClick={() => setDraft(suggested)}
              className="cursor-pointer text-sm font-medium text-ember transition-colors hover:text-ink"
            >
              Use suggestion
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              setDraft(effective);
              setEditing(false);
            }}
            className="cursor-pointer text-sm font-medium text-muted transition-colors hover:text-ink"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  const hasAny = FIELDS.some((f) => effective[f.key] != null);

  return (
    <div>
      {hasAny ? (
        <ul className="flex flex-wrap gap-x-6 gap-y-2">
          {FIELDS.map((f) =>
            effective[f.key] != null ? (
              <li key={f.key} className="text-sm">
                <span className="text-muted">{f.label} </span>
                <span className="font-medium text-ink">
                  {effective[f.key]}
                  {f.unit === "g" ? "g" : ""}
                </span>
              </li>
            ) : null,
          )}
        </ul>
      ) : (
        <p className="text-sm text-muted">
          No targets yet. Add your height &amp; weight during onboarding for an
          auto-suggestion, or set them manually.
        </p>
      )}
      <button
        type="button"
        onClick={() => {
          setDraft(effective);
          setEditing(true);
        }}
        className="mt-3 cursor-pointer text-sm font-medium text-ember transition-colors hover:text-ink"
      >
        {hasAny ? "Edit targets" : "Set targets"}
      </button>
      {!saved && suggested && hasAny && (
        <p className="mt-2 text-xs text-faint">
          Suggested from your profile — edit to make them yours.
        </p>
      )}
    </div>
  );
}
