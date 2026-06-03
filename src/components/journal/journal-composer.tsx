"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import DateField from "@/components/date-field";
import { createClient } from "@/lib/supabase/client";
import { useToday } from "@/lib/use-today";
import { MOODS, type Mood } from "@/lib/journal";
import { addJournalEntry } from "@/app/app/journal/actions";

type Pic = { path: string; preview: string };

export default function JournalComposer({ userId }: { userId: string }) {
  const router = useRouter();
  const today = useToday();
  const fileRef = useRef<HTMLInputElement>(null);
  const [date, setDate] = useState("");
  const [mood, setMood] = useState<Mood | null>(null);
  const [body, setBody] = useState("");
  const [pics, setPics] = useState<Pic[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function onFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (files.length === 0) return;
    if (pics.length + files.length > 6) {
      setError("Up to 6 photos per entry.");
      return;
    }
    setError(null);
    setUploading(true);
    const supabase = createClient();
    for (const file of files) {
      if (!file.type.startsWith("image/")) continue;
      if (file.size > 5 * 1024 * 1024) {
        setError("Each photo must be under 5 MB.");
        continue;
      }
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
      const path = `${userId}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("journal")
        .upload(path, file, { contentType: file.type });
      if (upErr) {
        setError("Upload failed. Make sure you've run supabase/journal.sql.");
        continue;
      }
      setPics((p) => [...p, { path, preview: URL.createObjectURL(file) }]);
    }
    setUploading(false);
  }

  function removePic(path: string) {
    setPics((p) => p.filter((x) => x.path !== path));
    createClient().storage.from("journal").remove([path]);
  }

  function save() {
    setError(null);
    startTransition(async () => {
      const res = await addJournalEntry({
        date: date || today,
        mood,
        body,
        imagePaths: pics.map((p) => p.path),
      });
      if (res.error) {
        setError(res.error);
        return;
      }
      setMood(null);
      setBody("");
      setPics([]);
      setDate("");
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      {/* Date + mood */}
      <div className="flex flex-wrap items-end gap-4">
        <div className="min-w-[12rem]">
          <p className="mb-1.5 text-sm font-medium text-ink-soft">Date</p>
          <DateField value={date || today} onChange={setDate} max={today || undefined} />
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

      {/* Body */}
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={4}
        placeholder="How did today go? What's on your mind?"
        className="w-full rounded-xl border border-line bg-paper-bright px-4 py-3 text-[0.95rem] leading-relaxed text-ink placeholder:text-faint transition-colors focus:border-ember focus:outline-none"
      />

      {/* Photos */}
      {pics.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {pics.map((p) => (
            <div key={p.path} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.preview} alt="" className="size-20 rounded-lg object-cover ring-1 ring-line" />
              <button
                type="button"
                onClick={() => removePic(p.path)}
                aria-label="Remove photo"
                className="absolute -right-1.5 -top-1.5 grid size-5 cursor-pointer place-items-center rounded-full bg-ink text-paper-bright"
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden><path d="M6 6l12 12M18 6 6 18" /></svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {error && <p className="text-sm text-danger">{error}</p>}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={pending || uploading}
          className="cursor-pointer rounded-full bg-ink px-6 py-2.5 text-sm font-medium text-paper-bright transition-colors hover:bg-ink-soft disabled:opacity-70"
        >
          {pending ? "Saving…" : "Save entry"}
        </button>
        <input ref={fileRef} type="file" accept="image/*" multiple onChange={onFiles} className="hidden" />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="cursor-pointer text-sm font-medium text-ember transition-colors hover:text-ink disabled:opacity-60"
        >
          {uploading ? "Uploading…" : "Add photos"}
        </button>
      </div>
    </div>
  );
}
