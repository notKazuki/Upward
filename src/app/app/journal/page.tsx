import type { Metadata } from "next";
import DashboardCard from "@/components/dashboard/card";
import JournalComposer from "@/components/journal/journal-composer";
import { createClient } from "@/lib/supabase/server";
import { currentUser } from "@/lib/auth";
import { formatDate, moodMeta, type JournalEntry } from "@/lib/journal";
import { deleteJournalEntry } from "./actions";

export const metadata: Metadata = { title: "Journal — Upward" };

export default async function JournalPage() {
  const supabase = await createClient();
  const user = await currentUser();

  const { data, error } = await supabase
    .from("journal_entries")
    .select("*")
    .order("entry_date", { ascending: false })
    .order("created_at", { ascending: false });

  const tableMissing = Boolean(error);
  const entries = (data ?? []) as JournalEntry[];

  // Sign all photo URLs (private bucket) in one batch.
  const allPaths = entries.flatMap((e) => e.image_paths ?? []);
  const signed: Record<string, string> = {};
  if (allPaths.length > 0) {
    const { data: urls } = await supabase.storage
      .from("journal")
      .createSignedUrls(allPaths, 3600);
    for (const u of urls ?? []) {
      if (u.signedUrl && u.path) signed[u.path] = u.signedUrl;
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <h1 className="font-display text-[2rem] font-normal tracking-tight text-ink">
          Journal
        </h1>
        <p className="mt-1 text-sm text-muted">
          A private space to reflect — how you felt, what happened, the photos you
          want to keep.
        </p>
      </div>

      {tableMissing ? (
        <DashboardCard title="One step left">
          <p className="text-sm leading-relaxed text-muted">
            Run <code className="text-ink">supabase/journal.sql</code> in Supabase
            → <b>SQL Editor</b>, then refresh this page.
          </p>
        </DashboardCard>
      ) : (
        <>
          <DashboardCard title="New entry">
            {user && <JournalComposer userId={user.id} />}
          </DashboardCard>

          {entries.length === 0 ? (
            <div className="rounded-2xl border border-line bg-card px-6 py-12 text-center">
              <p className="font-display text-xl text-ink">Your journal is empty</p>
              <p className="mx-auto mt-1 max-w-sm text-sm text-muted">
                Write your first entry above. Over time it becomes a record of how
                things really went.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {entries.map((e) => {
                const mood = moodMeta(e.mood);
                const pics = (e.image_paths ?? [])
                  .map((p) => signed[p])
                  .filter(Boolean);
                return (
                  <article key={e.id} className="rounded-2xl border border-line bg-card p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="font-display text-lg text-ink">
                          {formatDate(e.entry_date)}
                        </h2>
                        {mood && (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-paper px-2.5 py-0.5 text-xs font-medium text-ink-soft">
                            <span className="inline-block size-2 rounded-full" style={{ backgroundColor: mood.color }} />
                            {mood.label}
                          </span>
                        )}
                      </div>
                      <form action={deleteJournalEntry}>
                        <input type="hidden" name="id" value={e.id} />
                        <button
                          type="submit"
                          aria-label="Delete entry"
                          className="grid size-8 cursor-pointer place-items-center rounded-lg text-faint transition-colors hover:bg-paper hover:text-danger"
                        >
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M3 6h18M8 6V4h8v2m-9 0 1 14h8l1-14" /></svg>
                        </button>
                      </form>
                    </div>

                    {e.body && (
                      <p className="mt-2 whitespace-pre-wrap text-[0.95rem] leading-relaxed text-ink-soft">
                        {e.body}
                      </p>
                    )}

                    {pics.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {pics.map((url, i) => (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            key={i}
                            src={url}
                            alt=""
                            className="size-28 rounded-lg object-cover ring-1 ring-line"
                          />
                        ))}
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
