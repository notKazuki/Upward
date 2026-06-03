"use client";

import { useState, useTransition } from "react";
import { updateDisplayName } from "@/app/app/account/actions";
import { DISPLAY_NAME_MAX } from "@/lib/username";

export default function DisplayNameForm({
  current,
  placeholder,
}: {
  current: string | null;
  placeholder?: string;
}) {
  const [value, setValue] = useState(current ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  const dirty = value.trim() !== (current ?? "").trim();

  function save() {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const res = await updateDisplayName(value.trim());
      if (res.error) setError(res.error);
      else setSaved(true);
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-stretch gap-2">
        <input
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setSaved(false);
            setError(null);
          }}
          maxLength={DISPLAY_NAME_MAX}
          placeholder={placeholder ?? "Your name"}
          aria-label="Display name"
          className="w-full rounded-xl border border-line bg-paper-bright px-4 py-2.5 text-[0.95rem] text-ink placeholder:text-faint transition-colors focus:border-ember focus:outline-none"
        />
        <button
          type="button"
          onClick={save}
          disabled={!dirty || pending || value.trim().length === 0}
          className="cursor-pointer rounded-xl bg-ink px-5 text-sm font-medium text-paper-bright transition-colors hover:bg-ink-soft disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save"}
        </button>
      </div>
      <p className="min-h-[1.25rem] text-xs" aria-live="polite">
        {error ? (
          <span className="text-danger">{error}</span>
        ) : saved ? (
          <span className="text-ember">Saved.</span>
        ) : (
          <span className="text-faint">
            Shown around the app. Change it anytime.
          </span>
        )}
      </p>
    </div>
  );
}
