"use client";

import { useEffect, useRef, useState } from "react";
import {
  checkUsernameAvailable,
  updateUsername,
} from "@/app/app/account/actions";
import { USERNAME_RE } from "@/lib/username";

type Status =
  | "idle"
  | "checking"
  | "available"
  | "taken"
  | "invalid"
  | "current";

export default function UsernameForm({ current }: { current: string | null }) {
  const [value, setValue] = useState(current ?? "");
  const [status, setStatus] = useState<Status>(current ? "current" : "idle");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setSaved(false);
    const name = value.trim();
    if (timer.current) clearTimeout(timer.current);

    if (name === (current ?? "")) {
      setStatus("current");
      return;
    }
    if (!USERNAME_RE.test(name)) {
      setStatus(name.length === 0 ? "idle" : "invalid");
      return;
    }
    setStatus("checking");
    timer.current = setTimeout(async () => {
      const res = await checkUsernameAvailable(name);
      setStatus(res.available ? "available" : "taken");
    }, 400);

    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [value, current]);

  async function save() {
    setSaving(true);
    const res = await updateUsername(value.trim());
    setSaving(false);
    if (res.error) {
      setStatus("taken");
      return;
    }
    setSaved(true);
    setStatus("current");
  }

  const canSave =
    status === "available" && value.trim() !== (current ?? "") && !saving;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-stretch gap-2">
        <div className="relative flex-1">
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted">
            @
          </span>
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            maxLength={17}
            spellCheck={false}
            autoCapitalize="none"
            placeholder="username"
            aria-label="Username"
            className="w-full rounded-xl border border-line bg-paper-bright py-2.5 pl-8 pr-4 text-[0.95rem] text-ink placeholder:text-faint transition-colors focus:border-ember focus:outline-none"
          />
        </div>
        <button
          type="button"
          onClick={save}
          disabled={!canSave}
          className="cursor-pointer rounded-xl bg-ink px-5 text-sm font-medium text-paper-bright transition-colors hover:bg-ink-soft disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </div>

      <p className="min-h-[1.25rem] text-xs" aria-live="polite">
        {status === "checking" && <span className="text-muted">Checking…</span>}
        {status === "available" && (
          <span className="text-ember">@{value.trim()} is available</span>
        )}
        {status === "taken" && (
          <span className="text-danger">That username is taken.</span>
        )}
        {status === "invalid" && (
          <span className="text-danger">
            2–17 letters, numbers, or underscores.
          </span>
        )}
        {status === "current" && saved && (
          <span className="text-ember">Saved.</span>
        )}
        {status === "current" && !saved && current && (
          <span className="text-faint">This is your current username.</span>
        )}
      </p>
    </div>
  );
}
