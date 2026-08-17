import type { Metadata } from "next";
import { Suspense } from "react";
import CoachBrief from "@/components/coach/coach-brief";
import CoachChat from "@/components/coach/coach-chat";
import { isAiSherpaConfigured } from "@/lib/sherpa-ai";
import { FREE_SHERPA_DAILY } from "@/lib/pro";
import { getCoachContext } from "@/lib/coach-data";
import { buildBrief } from "@/lib/sherpa";
import { getProStatus } from "@/lib/pro-data";

export const metadata: Metadata = { title: "Coach — Upward" };

/** The daily brief needs the full cross-domain read, so it streams in while the
 * chat below it is already usable. */
async function Brief() {
  const ctx = await getCoachContext();
  if (!ctx) return null;
  return <CoachBrief brief={buildBrief(ctx)} />;
}

function BriefSkeleton() {
  return (
    <div
      aria-hidden
      className="h-[188px] animate-pulse rounded-2xl border border-line bg-card"
    />
  );
}

export default async function CoachPage() {
  const proStatus = await getProStatus();

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="u-rise u-d1">
        <h1 className="font-display text-[2rem] font-normal tracking-tight text-ink">Coach</h1>
        <p className="mt-1 text-sm text-muted">
          Your Sherpa — it reads everything you track and tells you what matters.
        </p>
      </div>

      <Suspense fallback={<BriefSkeleton />}>
        <Brief />
      </Suspense>

      <CoachChat
        configured={isAiSherpaConfigured}
        pro={proStatus.pro}
        freeLimit={FREE_SHERPA_DAILY}
      />
    </div>
  );
}
