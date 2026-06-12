"use client";

import { useState, useTransition } from "react";
import {
  ACCENTS,
  TITLES,
  accentUnlocked,
  titleUnlocked,
  accentHint,
  titleHint,
} from "@/lib/cosmetics";
import { saveCosmetics } from "@/app/app/character/cosmetics-actions";

export default function Loadout({
  level,
  earnedIds,
  accentId,
  titleId,
}: {
  level: number;
  earnedIds: string[];
  accentId: string;
  titleId: string | null;
}) {
  const earned = new Set(earnedIds);
  const [accent, setAccent] = useState(accentId);
  const [title, setTitle] = useState<string>(titleId ?? "none");
  const [, start] = useTransition();

  function pickAccent(id: string) {
    if (id === accent) return;
    const prev = accent;
    setAccent(id);
    start(async () => {
      const r = await saveCosmetics({ accent: id });
      if (!r.ok) setAccent(prev);
    });
  }

  function pickTitle(id: string) {
    if (id === title) return;
    const prev = title;
    setTitle(id);
    start(async () => {
      const r = await saveCosmetics({ title: id === "none" ? null : id });
      if (!r.ok) setTitle(prev);
    });
  }

  return (
    <div className="u-rise rounded-2xl border border-line bg-card p-6">
      <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-faint">Loadout</h3>
      <p className="mt-1 text-sm text-muted">Earned as you climb. Equip what you like — pure flair.</p>

      {/* Accents */}
      <div className="mt-5">
        <span className="text-[0.7rem] font-semibold uppercase tracking-[0.1em] text-faint">Accent</span>
        <div className="mt-2.5 flex flex-wrap gap-2.5">
          {ACCENTS.map((a) => {
            const unlocked = accentUnlocked(a, level);
            const selected = a.id === accent;
            return (
              <button
                key={a.id}
                type="button"
                disabled={!unlocked}
                onClick={() => pickAccent(a.id)}
                title={unlocked ? a.label : `${a.label} — ${accentHint(a)}`}
                aria-label={unlocked ? `Equip ${a.label} accent` : `${a.label}, locked: ${accentHint(a)}`}
                className={`relative grid size-9 place-items-center rounded-full border-2 transition-[transform,border-color] ${
                  unlocked ? "cursor-pointer hover:scale-105" : "cursor-not-allowed opacity-40"
                }`}
                style={{ borderColor: selected ? "var(--color-ink)" : "transparent" }}
              >
                <span className="size-6 rounded-full" style={{ backgroundColor: a.color }} />
                {!unlocked && (
                  <span className="absolute inset-0 grid place-items-center text-ink">
                    <LockIcon />
                  </span>
                )}
              </button>
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
            const unlocked = titleUnlocked(t, level, earned);
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

function LockIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  );
}
