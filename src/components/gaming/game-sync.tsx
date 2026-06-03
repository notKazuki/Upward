"use client";

import { useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  connectDota,
  connectRiot,
  disconnectProvider,
  syncGame,
  updateRiotId,
} from "@/app/app/gaming/actions";

const inputCls =
  "w-full rounded-xl border border-line bg-paper-bright px-4 py-2.5 text-[0.95rem] text-ink placeholder:text-faint transition-colors focus:border-ember focus:outline-none";
const btnCls =
  "cursor-pointer rounded-full bg-ink px-5 py-2 text-sm font-medium text-paper-bright transition-colors hover:bg-ink-soft disabled:cursor-not-allowed disabled:opacity-60";

type SyncConfig = {
  provider: string;
  intro: string;
  placeholder: string;
  help: ReactNode;
  editable: boolean; // can the handle be changed after connecting?
  connect: (
    gameId: string,
    value: string,
  ) => Promise<{ ok?: boolean; error?: string; name?: string | null }>;
  change?: (
    gameId: string,
    value: string,
  ) => Promise<{ ok?: boolean; error?: string; name?: string | null }>;
  connectedLine: (providerId: string, label: string | null) => string;
};

const CONFIGS: Record<string, SyncConfig> = {
  "dota-2": {
    provider: "opendota",
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
    editable: false,
    connect: (gameId, value) => connectDota({ gameId, account: value }),
    connectedLine: (id) => `Account ${id}`,
  },
  valorant: {
    provider: "henrikdev",
    intro:
      "Connect your Riot ID to auto-import recent Competitive matches (win/loss, agent, map, KDA).",
    placeholder: "Your Riot ID — e.g. Phoenix#NA1",
    help: <RiotHelp />,
    editable: true,
    connect: (gameId, value) => connectRiot({ gameId, riotId: value }),
    change: (gameId, value) => updateRiotId({ gameId, riotId: value }),
    connectedLine: (id, label) => {
      const region = id.split("|")[1];
      const r = region ? region.toUpperCase() : "";
      return label ? `${label}${r ? ` · ${r}` : ""}` : r ? `Region ${r}` : "Connected";
    },
  },
};

/** Shared "how to find / fix it" steps for the Valorant connect + change flows. */
export function RiotHelp() {
  return (
    <ul className="space-y-1">
      <li>
        Enter it as <span className="font-medium text-ink-soft">GameName#TAG</span>{" "}
        — your tag is on your Valorant career page (e.g. <code>Phoenix#NA1</code>).
      </li>
      <li>You must have played at least one Competitive match this act.</li>
      <li>
        Not found? Double-check the spelling and tag — they&rsquo;re
        case-insensitive but must be exact.
      </li>
    </ul>
  );
}

export default function GameSync({
  gameId,
  slug,
  provider,
  providerId,
  providerLabel,
  lastSyncedAt,
}: {
  gameId: string;
  slug: string;
  provider: string | null;
  providerId: string | null;
  providerLabel: string | null;
  lastSyncedAt: string | null;
}) {
  const router = useRouter();
  const cfg = CONFIGS[slug];
  const connected = !!cfg && provider === cfg.provider && !!providerId;
  const [value, setValue] = useState("");
  const [editValue, setEditValue] = useState("");
  const [editing, setEditing] = useState(false);
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

  function saveChange() {
    if (!cfg.change) return;
    setError(null);
    setMsg(null);
    startTransition(async () => {
      const res = await cfg.change!(gameId, editValue);
      if (res.error) setError(res.error);
      else {
        setEditing(false);
        setEditValue("");
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
          res.note ??
            (res.imported
              ? `Imported ${res.imported} new match${res.imported === 1 ? "" : "es"}.`
              : "You're already up to date."),
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
        <div className="text-xs leading-relaxed text-faint">{cfg.help}</div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-ink">Connected</p>
          <p className="text-xs text-muted">
            {cfg.connectedLine(providerId as string, providerLabel)}
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

      {cfg.editable && editing && (
        <div className="space-y-2 rounded-xl border border-line bg-paper-bright p-3">
          <label className="block text-xs font-medium text-ink-soft">
            New Riot ID
          </label>
          <input
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            placeholder={cfg.placeholder}
            className={inputCls}
            spellCheck={false}
            autoFocus
          />
          <div className="text-xs leading-relaxed text-faint">{cfg.help}</div>
          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={saveChange}
              disabled={pending || !editValue.trim()}
              className={btnCls}
            >
              {pending ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              onClick={() => {
                setEditing(false);
                setEditValue("");
                setError(null);
              }}
              disabled={pending}
              className="cursor-pointer text-xs font-medium text-muted transition-colors hover:text-ink disabled:opacity-60"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="flex items-center gap-4">
        {cfg.editable && !editing && (
          <button
            type="button"
            onClick={() => {
              setEditing(true);
              setEditValue(providerLabel ?? "");
              setMsg(null);
              setError(null);
            }}
            disabled={pending}
            className="cursor-pointer text-xs font-medium text-muted transition-colors hover:text-ink disabled:opacity-60"
          >
            Change Riot ID
          </button>
        )}
        <button
          type="button"
          onClick={disconnect}
          disabled={pending}
          className="cursor-pointer text-xs font-medium text-muted transition-colors hover:text-danger disabled:opacity-60"
        >
          Disconnect
        </button>
      </div>
    </div>
  );
}
