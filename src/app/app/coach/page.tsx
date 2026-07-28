import type { Metadata } from "next";
import CoachBrief from "@/components/coach/coach-brief";
import CoachChat from "@/components/coach/coach-chat";
import { isAiSherpaConfigured } from "@/lib/sherpa-ai";
import { FREE_SHERPA_DAILY } from "@/lib/pro";
import { getCoachContext } from "@/lib/coach-data";
import { buildBrief } from "@/lib/sherpa";
import { getProStatus } from "@/lib/pro-data";

export const metadata: Metadata = { title: "Coach — Upward" };

export default async function CoachPage() {
  const [ctx, proStatus] = await Promise.all([getCoachContext(), getProStatus()]);
  const brief = ctx ? buildBrief(ctx) : null;

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <h1 className="font-display text-[2rem] font-normal tracking-tight text-ink">Coach</h1>
        <p className="mt-1 text-sm text-muted">
          Your Sherpa — it reads everything you track and tells you what matters.
        </p>
      </div>

      {brief && <CoachBrief brief={brief} />}
      <CoachChat
        configured={isAiSherpaConfigured}
        pro={proStatus.pro}
        freeLimit={FREE_SHERPA_DAILY}
      />
    </div>
  );
}
