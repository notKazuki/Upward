"use client";

import { useState, useTransition } from "react";
import { deleteAccount } from "@/app/app/account/actions";

export default function DangerZone({
  deletionEnabled,
}: {
  deletionEnabled: boolean;
}) {
  const [confirming, setConfirming] = useState(false);
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function remove() {
    setError(null);
    startTransition(async () => {
      const res = await deleteAccount(value.trim());
      // On success the action redirects to "/"; only errors return here.
      if (res?.error) setError(res.error);
    });
  }

  return (
    <div className="space-y-6">
      {/* Export */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium text-ink">Export your data</p>
          <p className="text-sm text-muted">
            Download everything you&rsquo;ve logged as a JSON file.
          </p>
        </div>
        <a
          href="/app/account/export"
          className="shrink-0 cursor-pointer rounded-full border border-line bg-paper-bright px-4 py-2 text-sm font-medium text-ink-soft transition-colors hover:border-ember hover:text-ember"
        >
          Download (.json)
        </a>
      </div>

      {/* Delete */}
      <div className="border-t border-line pt-6">
        <p className="font-medium text-danger">Delete account</p>
        <p className="mt-1 text-sm text-muted">
          Permanently deletes your account and everything you&rsquo;ve logged.
          This can&rsquo;t be undone.
        </p>

        {!deletionEnabled ? (
          <p className="mt-3 text-xs text-faint">
            Account deletion isn&rsquo;t enabled on this deployment yet.
          </p>
        ) : !confirming ? (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="mt-3 cursor-pointer rounded-full border border-danger/40 px-4 py-2 text-sm font-medium text-danger transition-colors hover:bg-danger/10"
          >
            Delete my account
          </button>
        ) : (
          <div className="mt-3 space-y-3 rounded-xl border border-danger/40 bg-danger/5 p-4">
            <label className="block text-sm text-ink-soft">
              Type <span className="font-semibold text-danger">DELETE</span> to
              confirm
              <input
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="DELETE"
                autoFocus
                className="mt-1.5 w-full rounded-lg border border-line bg-paper-bright px-3 py-2 text-sm text-ink placeholder:text-faint focus:border-danger focus:outline-none"
              />
            </label>
            {error && <p className="text-sm text-danger">{error}</p>}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={remove}
                disabled={value.trim().toUpperCase() !== "DELETE" || pending}
                className="cursor-pointer rounded-full bg-danger px-5 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {pending ? "Deleting…" : "Permanently delete"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setConfirming(false);
                  setValue("");
                  setError(null);
                }}
                className="cursor-pointer text-sm font-medium text-muted transition-colors hover:text-ink"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
