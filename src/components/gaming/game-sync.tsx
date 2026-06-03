"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  connectDota,
  disconnectProvider,
  syncGame,
} from "@/app/app/gaming/actions";

const inputCls =
  "w-full rounded-xl border border-line bg-paper-bright px-4 py-2.5 text-[0.95rem] text-ink placeholder:text-faint transition-colors focus:border-ember focus:outline-none";
const btnCls =
  "cursor-pointer rounded-full bg-ink px-5 py-2 text-sm font-medium text-paper-bright transition-colors hover:bg-ink-soft disabled:cursor-not-allowed disabled:opacity-60";

export default function GameSync({
  gameId,
  provider,
  providerId,
  lastSyncedAt,
}: {
  gameId: string;
  provider: string | null;
  providerId: string | null;
  lastSyncedAt: string | null;
}) {
  const router = useRouter();
  const connected = provider === "opendota" && !!providerId;
  const [account, setAccount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function connect() {
    setError(null);
    setMsg(null);
    startTransition(async () => {
      const res = await connectDota({ gameId, account });
      if (res.error) setError(res.error);
      else {
        setAccount("");
        router.refresh();
      }
    });
  }

  function sync() {
    setError(null);
    setMsg(null);
    startTransition(async () => {
      const res = await syncGame(gameId);
      if (res.error) setError(res.error);
      else {
        setMsg(
          res.imported
            ? `Imported ${res.imported} new match${res.imported === 1 ? "" : "es"}.`
            : "You're already up to date.",
        );
        router.refresh();
      }
    });
  }

  function disconnect() {
    startTransition(async () => {
      await disconnectProvider(gameId);
      router.refresh();
    });
  }

  if (!connected) {
    return (
      <div className="space-y-3">
        <p className="text-sm leading-relaxed text-muted">
          Connect your Dota 2 account to auto-import recent matches from
          OpenDota — free, no API key.
        </p>
        <input
          value={account}
          onChange={(e) => setAccount(e.target.value)}
          placeholder="Account ID, or your OpenDota / Dotabuff profile link"
          className={inputCls}
          spellCheck={false}
        />
        {error && <p className="text-sm text-danger">{error}</p>}
        <button type="button" onClick={connect} disabled={pending || !account.trim()} className={btnCls}>
          {pending ? "Connecting…" : "Connect"}
        </button>
        <p className="text-xs leading-relaxed text-faint">
          Find your ID at opendota.com — it&rsquo;s the number in your profile
          URL. Match history must be public (in Dota: Settings → Options →
          Expose Public Match Data).
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-ink">Connected to OpenDota</p>
          <p className="text-xs text-muted">
            Account {providerId}
            {lastSyncedAt &&
              ` · last synced ${new Date(lastSyncedAt).toLocaleString(undefined, {
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })}`}
          </p>
        </div>
        <button type="button" onClick={sync} disabled={pending} className={btnCls}>
          {pending ? "Syncing…" : "Sync now"}
        </button>
      </div>
      {msg && <p className="text-sm text-ember">{msg}</p>}
      {error && <p className="text-sm text-danger">{error}</p>}
      <button
        type="button"
        onClick={disconnect}
        disabled={pending}
        className="cursor-pointer text-xs font-medium text-muted transition-colors hover:text-danger disabled:opacity-60"
      >
        Disconnect
      </button>
    </div>
  );
}
