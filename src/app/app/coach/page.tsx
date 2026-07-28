import type { Metadata } from "next";
import DashboardCard from "@/components/dashboard/card";
import SherpaCard from "@/components/character/sherpa-card";
import SherpaChat from "@/components/character/sherpa-chat";
import { isAiSherpaConfigured } from "@/lib/sherpa-ai";
import { FREE_SHERPA_DAILY } from "@/lib/pro";
import { getCharacter } from "@/lib/character-data";
import { getOwnProgress } from "@/lib/progress-data";
import { buildSkillTrees } from "@/lib/skill-trees";
import { buildSherpa } from "@/lib/sherpa";
import { getProStatus } from "@/lib/pro-data";

export const metadata: Metadata = { title: "Coach — Upward" };

function Header() {
  return (
    <div>
      <h1 className="font-display text-[2rem] font-normal tracking-tight text-ink">
        Coach
      </h1>
      <p className="mt-1 text-sm text-muted">
        Your Sherpa — reads everything you track, tells you what matters today.
      </p>
    </div>
  );
}

export default async function CoachPage() {
  const [character, progress, proStatus] = await Promise.all([
    getCharacter(),
    getOwnProgress(),
    getProStatus(),
  ]);

  if (!character || !progress) {
    return (
      <div className="mx-auto max-w-3xl space-y-5">
        <Header />
        <DashboardCard title="Log a day to meet your coach">
          <p className="text-sm leading-relaxed text-muted">
            Track a workout, a meal, or a match and the Sherpa starts reading your
            week — then it can brief you and answer anything.
          </p>
        </DashboardCard>
        <SherpaChat
          configured={isAiSherpaConfigured}
          pro={proStatus.pro}
          freeLimit={FREE_SHERPA_DAILY}
        />
      </div>
    );
  }

  const trees = buildSkillTrees(progress.stats, new Set(progress.earned.map((e) => e.id)));
  const sherpa = buildSherpa(character, trees);

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Header />
      <SherpaCard brief={sherpa} />
      <SherpaChat
        configured={isAiSherpaConfigured}
        pro={proStatus.pro}
        freeLimit={FREE_SHERPA_DAILY}
      />
    </div>
  );
}
