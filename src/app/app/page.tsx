import type { Metadata } from "next";
import { Suspense } from "react";
import QuickLog from "@/components/voice/quick-log";
import TodayFeed, { TodayFeedSkeleton } from "@/components/today/today-feed";
import { createClient } from "@/lib/supabase/server";
import { currentUser } from "@/lib/auth";
import { serverToday } from "@/lib/server-today";
import { getProStatus } from "@/lib/pro-data";
import { isAiSherpaConfigured } from "@/lib/sherpa-ai";

export const metadata: Metadata = { title: "Today — Upward" };

/**
 * Today — the daily loop. The header and the capture box (the reason you opened
 * the app) render from two cheap lookups so they're on screen and usable
 * immediately; everything that needs the full data batch streams in behind a
 * Suspense boundary.
 */
export default async function TodayPage() {
  const user = await currentUser();
  const supabase = await createClient();

  const [today, proStatus, nameRes] = await Promise.all([
    serverToday(),
    getProStatus(),
    user
      ? supabase.from("profiles").select("display_name, username").eq("id", user.id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);

  const name = (
    ((nameRes.error ? null : nameRes.data?.display_name) as string | null) ||
    ((nameRes.error ? null : nameRes.data?.username) as string | null) ||
    ""
  ).trim();

  const [yy, mm, dd] = today.split("-").map(Number);
  const dateLabel = new Date(yy, mm - 1, dd).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      {/* Header */}
      <div className="u-rise u-d1">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-faint">
          {dateLabel}
        </p>
        <h1 className="mt-1 font-display text-[2rem] font-normal tracking-tight text-ink">
          {name ? `Hi, ${name}` : "Today"}
        </h1>
      </div>

      {/* The hero: log your day — interactive before anything else loads. */}
      <div className="u-rise u-d2 rounded-2xl border border-line bg-card p-6">
        <h2 className="font-display text-xl text-ink">Log your day</h2>
        <p className="mt-1 text-sm text-muted">
          Talk or type it in one go — no tapping through six forms.
        </p>
        <div className="mt-4">
          <QuickLog isPro={proStatus.pro} aiConfigured={isAiSherpaConfigured} />
        </div>
      </div>

      <Suspense fallback={<TodayFeedSkeleton />}>
        <TodayFeed />
      </Suspense>
    </div>
  );
}
