"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import Avatar from "@/components/social/avatar";
import {
  ACCENTS,
  FRAMES,
  TITLES,
  accentUnlocked,
  frameUnlocked,
  titleUnlocked,
  accentHint,
  frameHint,
  titleHint,
  frameColorOf,
  PRO_HINT,
} from "@/lib/cosmetics";
import { saveCosmetics } from "@/app/app/character/cosmetics-actions";

export default function Loadout({
  level,
  earnedIds,
  isPro,
  accentId,
  titleId,
  frameId,
  avatarUrl,
  name,
}: {
  level: number;
  earnedIds: string[];
  isPro: boolean;
  accentId: string;
  titleId: string | null;
  frameId: string;
  avatarUrl: string | null;
  name: string;
}) {
  const earned = new Set(earnedIds);
  const [accent, setAccent] = useState(accentId);
  const [title, setTitle] = useState<string>(titleId ?? "none");
  const [frame, setFrame] = useState(frameId);
  const [, start] = useTransition();

  function persist(prev: () => void, payload: Parameters<typeof saveCosmetics>[0]) {
    start(async () => {
      const r = await saveCosmetics(payload);
      if (!r.ok) prev();
    });
  }
  function pickAccent(id: string) {
    if (id === accent) return;
    const prev = accent;
    setAccent(id);
    persist(() => setAccent(prev), { accent: id });
  }
  function pickFrame(id: string) {
    if (id === frame) return;
    const prev = frame;
    setFrame(id);
    persist(() => setFrame(prev), { frame: id === "none" ? null : id });
  }
  function pickTitle(id: string) {
    if (id === title) return;
    const prev = title;
    setTitle(id);
    persist(() => setTitle(prev), { title: id === "none" ? null : id });
  }

  const previewProfile = { id: "preview", username: null, display_name: name, avatar_url: avatarUrl, bio: null };

  return (
    <div className="u-rise rounded-2xl border border-line bg-card p-6">
      <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-faint">Loadout</h3>
      <p className="mt-1 text-sm text-muted">
        Earned as you climb. Equip what you like — pure flair.
        {!isPro && <span className="text-faint"> Sparkle marks Pro-only flair.</span>}
      </p>

      {/* Frame — with a live preview of your avatar */}
      <div className="mt-5 flex flex-wrap items-center gap-5">
        <Avatar profile={previewProfile} size={56} frameColor={frameColorOf(frame)} />
        <div className="min-w-0 flex-1">
          <span className="text-[0.7rem] font-semibold uppercase tracking-[0.1em] text-faint">Frame</span>
          <div className="mt-2.5 flex flex-wrap gap-2.5">
            {FRAMES.map((f) => {
              const unlocked = frameUnlocked(f, level, isPro);
              const proLocked = Boolean(f.pro) && !isPro;
              const selected = f.id === frame;
              const inner = (
                <span
                  className="size-6 rounded-full bg-paper-bright"
                  style={f.color ? { boxShadow: `inset 0 0 0 2px ${f.color}` } : { boxShadow: "inset 0 0 0 1px var(--color-line)" }}
                />
              );
              if (proLocked) return <ProSwatch key={f.id} label={f.label}>{inner}</ProSwatch>;
              return (
                <Swatch
                  key={f.id}
                  unlocked={unlocked}
                  selected={selected}
                  label={f.label}
                  hint={frameHint(f)}
                  kind="frame"
                  onClick={() => pickFrame(f.id)}
                >
                  {inner}
                </Swatch>
              );
            })}
          </div>
        </div>
      </div>

      {/* Accents */}
      <div className="mt-5">
        <span className="text-[0.7rem] font-semibold uppercase tracking-[0.1em] text-faint">Accent</span>
        <div className="mt-2.5 flex flex-wrap gap-2.5">
          {ACCENTS.map((a) => {
            const unlocked = accentUnlocked(a, level, isPro);
            const proLocked = Boolean(a.pro) && !isPro;
            const selected = a.id === accent;
            const inner = <span className="size-6 rounded-full" style={{ backgroundColor: a.color }} />;
            if (proLocked) return <ProSwatch key={a.id} label={a.label}>{inner}</ProSwatch>;
            return (
              <Swatch
                key={a.id}
                unlocked={unlocked}
                selected={selected}
                label={a.label}
                hint={accentHint(a)}
                kind="accent"
                onClick={() => pickAccent(a.id)}
              >
                {inner}
              </Swatch>
            );
          })}
        </div>
      </div>

      {/* Titles */}
      <div className="mt-5">
        <span className="text-[0.7rem] font-semibold uppercase tracking-[0.1em] text-faint">Title</span>
        <div className="mt-2.5 flex flex-wrap gap-2">
          <Chip label="No title" selected={title === "none"} unlocked onClick={() => pickTitle("none")} />
          {TITLES.map((t) => {
            const unlocked = titleUnlocked(t, level, earned, isPro);
            const proLocked = Boolean(t.pro) && !isPro;
            if (proLocked) return <ProChip key={t.id} label={t.label} />;
            return (
              <Chip
                key={t.id}
                label={t.label}
                selected={title === t.id}
                unlocked={unlocked}
                hint={unlocked ? undefined : titleHint(t)}
                onClick={() => unlocked && pickTitle(t.id)}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Swatch({
  unlocked,
  selected,
  label,
  hint,
  kind,
  onClick,
  children,
}: {
  unlocked: boolean;
  selected: boolean;
  label: string;
  hint: string;
  kind: "frame" | "accent";
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={!unlocked}
      onClick={onClick}
      title={unlocked ? label : `${label} — ${hint}`}
      aria-label={unlocked ? `Equip ${label} ${kind}` : `${label}, locked: ${hint}`}
      className={`relative grid size-9 place-items-center rounded-full border-2 transition-[transform,border-color] ${
        unlocked ? "cursor-pointer hover:scale-105" : "cursor-not-allowed opacity-40"
      }`}
      style={{ borderColor: selected ? "var(--color-ink)" : "transparent" }}
    >
      {children}
      {!unlocked && (
        <span className="absolute inset-0 grid place-items-center text-ink">
          <LockIcon />
        </span>
      )}
    </button>
  );
}

// A Pro-locked swatch routes to the upgrade page and wears a sparkle.
function ProSwatch({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Link
      href="/app/upgrade"
      title={`${label} — ${PRO_HINT}`}
      aria-label={`${label}, Pro-only — upgrade to unlock`}
      className="relative grid size-9 cursor-pointer place-items-center rounded-full border-2 border-transparent opacity-60 transition-opacity hover:opacity-100"
    >
      {children}
      <span className="absolute -right-0.5 -top-0.5 grid size-4 place-items-center rounded-full bg-ember text-paper">
        <SparkIcon />
      </span>
    </Link>
  );
}

function Chip({
  label,
  selected,
  unlocked,
  hint,
  onClick,
}: {
  label: string;
  selected: boolean;
  unlocked: boolean;
  hint?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={!unlocked}
      onClick={onClick}
      title={unlocked ? label : `${label} — ${hint}`}
      className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors ${
        selected
          ? "border-ember bg-ember/10 text-ink"
          : unlocked
            ? "cursor-pointer border-line bg-paper-bright text-ink-soft hover:border-ember/50"
            : "cursor-not-allowed border-line bg-paper-bright/40 text-faint"
      }`}
    >
      {!unlocked && <LockIcon />}
      {label}
    </button>
  );
}

// A Pro-locked title chip — links to upgrade, sparkle instead of a lock.
function ProChip({ label }: { label: string }) {
  return (
    <Link
      href="/app/upgrade"
      title={`${label} — ${PRO_HINT}`}
      className="flex cursor-pointer items-center gap-1.5 rounded-full border border-ember/30 bg-ember/5 px-3 py-1.5 text-sm text-ember/90 transition-colors hover:border-ember/60"
    >
      <SparkIcon />
      {label}
    </Link>
  );
}

function LockIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  );
}

function SparkIcon() {
  return (
    <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 3c.4 3.6 1.4 4.6 5 5-3.6.4-4.6 1.4-5 5-.4-3.6-1.4-4.6-5-5 3.6-.4 4.6-1.4 5-5Z" />
    </svg>
  );
}
