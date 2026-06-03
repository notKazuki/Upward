"use client";

import { useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  connectDota,
  connectRiot,
  disconnectProvider,
  syncGame,
} from "@/app/app/gaming/actions";

const inputCls =
  "w-full rounded-xl border border-line bg-paper-bright px-4 py-2.5 text-[0.95rem] text-ink placeholder:text-faint transition-colors focus:border-ember focus:outline-none";
const btnCls =
  "cursor-pointer rounded-full bg-ink px-5 py-2 text-sm font-medium text-paper-bright transition-colors hover:bg-ink-soft disabled:cursor-not-allowed disabled:opacity-60";

type SyncConfig = {
  provider: string;
  label: string;
  intro: string;
  placeholder: string;
  help: ReactNode;
  connect: (
    gameId: string,
    value: string,
  ) => Promise<{ ok?: boolean; error?: string; name?: string | null }>;
  connectedLine: (providerId: string) => string;
};

const CONFIGS: Record<string, SyncConfig> = {
  "dota-2": {
    provider: "opendota",
    label: "OpenDota",
    intro:
      "Connect your Dota 2 account to auto-import recent matches from OpenDota — free, no API key.",
    placeholder: "Account ID, or your OpenDota / Dotabuff profile link",
    help: (
      <>
        Find your ID at opendota.com — it&rsquo;s the number in your profile
        URL. Match history must be public (in Dota: Settings → Options → Expose
        Public Match Data).
      </>
    ),
    connect: (gameId, value) => connectDota({ gameId, account: value }),
    connectedLine: (id) => `Account ${id}`,
  },
  valorant: {
    provider: "henrikdev",
    label: "tracker",
    intro:
      "Connect your Riot ID to auto-import recent Competitive matches (win/loss, agent, map, KDA).",
    placeholder: "Your Riot ID — e.g. Phoenix#NA1",
    help: (
      <>
        Use your in-game Riot ID — your name plus the #tag (find it on your
        Valorant career page). Only ranked Competitive matches are imported.
      </>
    ),
    connect: (gameId, value) => connectRiot({ gameId, riotId: value }),
    connectedLine: (id) => {
      const region = id.split("|")[1];
      return region ? `Region ${region.toUpperCase()}` : "Connected";
    },
  },
};

export default function GameSync({
  gameId,
  slug,
  provider,
  providerId,
  lastSyncedAt,
}: {
  gameId: string;
  slug: string;
  provider: string | null;
  providerId: string | null;
  lastSyncedAt: string | null;
}) {
  const router = useRouter();
  const cfg = CONFIGS[slug];
  const connected = !!cfg && provider === cfg.provider && !!providerId;
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!cfg) return null;

  function connect() {
    setError(null);
    setMsg(null);
    startTransition(async () => {
      const res = await cfg.connect(gameId, value);
      if (res.error) setError(res.error);
      else {
        setValue("");
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
        <p className="text-sm leading-relaxed text-muted">{cfg.intro}</p>
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={cfg.placeholder}
          className={inputCls}
          spellCheck={false}
        />
        {error && <p className="text-sm text-danger">{error}</p>}
        <button
          type="button"
          onClick={connect}
          disabled={pending || !value.trim()}
          className={btnCls}
        >
          {pending ? "Connecting…" : "Connect"}
        </button>
        <p className="text-xs leading-relaxed text-faint">{cfg.help}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-ink">Connected</p>
          <p className="text-xs text-muted">
            {cfg.connectedLine(providerId as string)}
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
