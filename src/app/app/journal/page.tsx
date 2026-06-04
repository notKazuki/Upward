import type { Metadata } from "next";
import DashboardCard from "@/components/dashboard/card";
import JournalComposer from "@/components/journal/journal-composer";
import JournalEntryCard from "@/components/journal/journal-entry-card";
import { createClient } from "@/lib/supabase/server";
import { currentUser } from "@/lib/auth";
import { type JournalEntry } from "@/lib/journal";

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
                const pics = (e.image_paths ?? [])
                  .map((p) => signed[p])
                  .filter(Boolean);
                return (
                  <JournalEntryCard
                    key={e.id}
                    entry={{
                      id: e.id,
                      entry_date: e.entry_date,
                      mood: e.mood,
                      body: e.body,
                    }}
                    pics={pics}
                  />
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
