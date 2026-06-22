import type { Metadata } from "next";
import QuickLog from "@/components/voice/quick-log";
import { getProStatus } from "@/lib/pro-data";
import { isAiSherpaConfigured } from "@/lib/sherpa-ai";

export const metadata: Metadata = { title: "Quick Log — Upward" };

export default async function QuickLogPage() {
  const { pro } = await getProStatus();

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="u-rise u-d1">
        <h1 className="font-display text-[2rem] font-normal tracking-tight text-ink">Quick Log</h1>
        <p className="mt-1 text-sm text-muted">
          Talk or type your day in one go — no more tapping through six forms.
        </p>
      </div>
      <QuickLog isPro={pro} aiConfigured={isAiSherpaConfigured} />
    </div>
  );
}
