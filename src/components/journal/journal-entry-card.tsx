"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import DateField from "@/components/date-field";
import { useToday } from "@/lib/use-today";
import { MOODS, moodMeta, formatDate, type Mood } from "@/lib/journal";
import { updateJournalEntry, deleteJournalEntry } from "@/app/app/journal/actions";

type Entry = {
  id: string;
  entry_date: string;
  mood: Mood | null;
  body: string | null;
};

export default function JournalEntryCard({
  entry,
  pics,
}: {
  entry: Entry;
  pics: string[];
}) {
  const router = useRouter();
  const today = useToday();
  const [editing, setEditing] = useState(false);
  const [date, setDate] = useState(entry.entry_date);
  const [mood, setMood] = useState<Mood | null>(entry.mood);
  const [body, setBody] = useState(entry.body ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function startEdit() {
    setDate(entry.entry_date);
    setMood(entry.mood);
    setBody(entry.body ?? "");
    setError(null);
    setEditing(true);
  }

  function save() {
    setError(null);
    startTransition(async () => {
      const res = await updateJournalEntry({ id: entry.id, date, mood, body });
      if (res.error) {
        setError(res.error);
        return;
      }
      setEditing(false);
      router.refresh();
    });
  }

  const moodM = moodMeta(entry.mood);

  return (
    <article className="rounded-2xl border border-line bg-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="font-display text-lg text-ink">{formatDate(entry.entry_date)}</h2>
          {!editing && moodM && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-paper px-2.5 py-0.5 text-xs font-medium text-ink-soft">
              <span className="inline-block size-2 rounded-full" style={{ backgroundColor: moodM.color }} />
              {moodM.label}
            </span>
          )}
        </div>

        {!editing && (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={startEdit}
              aria-label="Edit entry"
              className="grid size-8 cursor-pointer place-items-center rounded-lg text-faint transition-colors hover:bg-paper hover:text-ink"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>
            </button>
            <form action={deleteJournalEntry}>
              <input type="hidden" name="id" value={entry.id} />
              <button
                type="submit"
                aria-label="Delete entry"
                className="grid size-8 cursor-pointer place-items-center rounded-lg text-faint transition-colors hover:bg-paper hover:text-danger"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M3 6h18M8 6V4h8v2m-9 0 1 14h8l1-14" /></svg>
              </button>
            </form>
          </div>
        )}
      </div>

      {editing ? (
        <div className="mt-3 space-y-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="min-w-[12rem]">
              <p className="mb-1.5 text-sm font-medium text-ink-soft">Date</p>
              <DateField value={date} onChange={setDate} max={today || undefined} />
            </div>
            <div>
              <p className="mb-1.5 text-sm font-medium text-ink-soft">Mood</p>
              <div className="flex flex-wrap gap-2">
                {MOODS.map((m) => {
                  const on = m.id === mood;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setMood(on ? null : m.id)}
                      aria-pressed={on}
                      className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                        on ? "border-ember bg-ember/10 text-ink" : "border-line bg-paper-bright text-ink-soft hover:border-ember/50"
                      }`}
                    >
                      <span className="inline-block size-2.5 rounded-full" style={{ backgroundColor: m.color }} />
                      {m.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={4}
            placeholder="How did today go? What's on your mind?"
            className="w-full rounded-xl border border-line bg-paper-bright px-4 py-3 text-[0.95rem] leading-relaxed text-ink placeholder:text-faint transition-colors focus:border-ember focus:outline-none"
          />

          {error && <p className="text-sm text-danger">{error}</p>}

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={save}
              disabled={pending}
              className="cursor-pointer rounded-full bg-ink px-6 py-2.5 text-sm font-medium text-paper-bright transition-colors hover:bg-ink-soft disabled:opacity-70"
            >
              {pending ? "Saving…" : "Save changes"}
            </button>
            <button
              type="button"
              onClick={() => {
                setEditing(false);
                setError(null);
              }}
              disabled={pending}
              className="cursor-pointer text-sm font-medium text-muted transition-colors hover:text-ink disabled:opacity-60"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <>
          {entry.body && (
            <p className="mt-2 whitespace-pre-wrap text-[0.95rem] leading-relaxed text-ink-soft">
              {entry.body}
            </p>
          )}
          {pics.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {pics.map((url, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={i} src={url} alt="" className="size-28 rounded-lg object-cover ring-1 ring-line" />
              ))}
            </div>
          )}
        </>
      )}
    </article>
  );
}
