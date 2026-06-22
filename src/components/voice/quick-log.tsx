"use client";

import { useState } from "react";
import Link from "next/link";
import Icon from "@/components/icons";
import VoiceCapture from "./voice-capture";
import SmartLogReview from "./smart-log-review";
import { addJournalEntry } from "@/app/app/journal/actions";
import type { SmartEntry } from "@/lib/smart-log";
import type { SmartSaveResult } from "@/app/app/log/smart-actions";

function localDate(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function QuickLog({ isPro, aiConfigured }: { isPro: boolean; aiConfigured: boolean }) {
  const [text, setText] = useState("");
  const [resetKey, setResetKey] = useState(0);
  const [busy, setBusy] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [entries, setEntries] = useState<SmartEntry[] | null>(null);
  const empty = text.trim().length === 0;

  function reset() {
    setText("");
    setResetKey((n) => n + 1);
  }

  async function saveJournal() {
    if (empty) return;
    setBusy(true);
    setError(null);
    setDone(null);
    try {
      const r = await addJournalEntry({ date: localDate(), body: text.trim() });
      if (r.error) {
        setError(r.error);
        return;
      }
      setDone("Saved to your journal.");
      reset();
    } catch {
      setError("Couldn’t save. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function runSmartLog() {
    if (empty) return;
    setParsing(true);
    setError(null);
    setDone(null);
    try {
      const res = await fetch("/api/smartlog", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ transcript: text.trim() }),
      });
      const data = (await res.json().catch(() => null)) as { entries?: SmartEntry[]; error?: string } | null;
      if (!res.ok) {
        setError(data?.error ?? "Smart Log couldn’t read that. Try again.");
        return;
      }
      setEntries(data?.entries ?? []);
    } catch {
      setError("Smart Log is unreachable right now. Try again.");
    } finally {
      setParsing(false);
    }
  }

  function onReviewed(r: SmartSaveResult) {
    setEntries(null);
    if (r.saved) {
      const parts = [
        r.saved.meals ? `${r.saved.meals} meal${r.saved.meals === 1 ? "" : "s"}` : null,
        r.saved.workouts ? `${r.saved.workouts} workout${r.saved.workouts === 1 ? "" : "s"}` : null,
        r.saved.notes ? "a journal note" : null,
      ].filter(Boolean);
      setDone(parts.length ? `Logged ${parts.join(" · ")}.` : "Nothing to log.");
    }
    reset();
  }

  // While reviewing parsed entries, the review card takes over.
  if (entries) {
    return (
      <div className="space-y-5">
        <SmartLogReview entries={entries} onDone={onReviewed} onCancel={() => setEntries(null)} />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="u-rise u-d2 rounded-2xl border border-line bg-card p-6">
        <VoiceCapture key={resetKey} value={text} onChange={setText} />

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={saveJournal}
            disabled={busy || parsing || empty}
            className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-paper-bright transition-colors hover:bg-ink-soft disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Icon name="journal" size={16} />
            {busy ? "Saving…" : "Save to journal"}
          </button>

          {isPro ? (
            aiConfigured ? (
              <button
                type="button"
                onClick={runSmartLog}
                disabled={parsing || busy || empty}
                className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-ember/40 bg-ember/10 px-5 py-2.5 text-sm font-medium text-ember transition-colors hover:bg-ember/15 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Icon name="sparkle" size={16} />
                {parsing ? "Reading…" : "Smart Log"}
              </button>
            ) : (
              <button
                type="button"
                disabled
                title="Smart Log activates once the AI Sherpa is enabled"
                className="inline-flex items-center gap-2 rounded-full border border-ember/40 bg-ember/10 px-5 py-2.5 text-sm font-medium text-ember disabled:cursor-not-allowed"
              >
                <Icon name="sparkle" size={16} />
                Smart Log · soon
              </button>
            )
          ) : (
            <Link
              href="/app/upgrade"
              className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-ember/40 bg-ember/10 px-5 py-2.5 text-sm font-medium text-ember transition-colors hover:bg-ember/15"
            >
              <Icon name="sparkle" size={16} />
              Smart Log with Pro
            </Link>
          )}
        </div>

        {done && <p className="mt-3 text-sm font-medium text-ember">{done}</p>}
        {error && <p className="mt-3 text-sm text-danger">{error}</p>}
      </div>

      {/* the two paths, explained */}
      <div className="u-rise u-d3 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-line bg-card p-5">
          <div className="flex items-center gap-2.5">
            <span className="grid size-8 place-items-center rounded-full bg-paper-bright text-ink-soft">
              <Icon name="journal" size={16} />
            </span>
            <h3 className="font-display text-base text-ink">Save to journal</h3>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Your words, saved as today’s journal entry. Free, always — speak or type.
          </p>
        </div>
        <div className="rounded-2xl border border-line bg-card p-5">
          <div className="flex items-center gap-2.5">
            <span className="grid size-8 place-items-center rounded-full bg-ember/15 text-ember">
              <Icon name="sparkle" size={16} />
            </span>
            <h3 className="font-display text-base text-ink">Smart Log</h3>
            <span className="rounded-full bg-ember/15 px-1.5 py-0.5 text-[0.6rem] font-bold uppercase tracking-[0.08em] text-ember">
              Pro
            </span>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            The Sherpa reads your brain-dump and turns it into structured meal and workout entries —
            you review, then save in one tap.
          </p>
        </div>
      </div>
    </div>
  );
}
