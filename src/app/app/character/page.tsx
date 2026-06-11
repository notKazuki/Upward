import type { Metadata } from "next";
import DashboardCard from "@/components/dashboard/card";
import CharacterSheet from "@/components/character/character-sheet";
import SkillTrees from "@/components/character/skill-trees";
import SherpaCard from "@/components/character/sherpa-card";
import { getCharacter } from "@/lib/character-data";
import { getOwnProgress } from "@/lib/progress-data";
import { buildSkillTrees } from "@/lib/skill-trees";
import { buildSherpa } from "@/lib/sherpa";

export const metadata: Metadata = { title: "Character — Upward" };

function Header() {
  return (
    <div>
      <h1 className="font-display text-[2rem] font-normal tracking-tight text-ink">Character</h1>
      <p className="mt-1 text-sm text-muted">
        Your real life as a character sheet — five attributes, derived from everything you track.
      </p>
    </div>
  );
}

export default async function CharacterPage() {
  const [character, progress] = await Promise.all([getCharacter(), getOwnProgress()]);

  if (!character || !progress) {
    return (
      <div className="mx-auto max-w-5xl space-y-5">
        <Header />
        <DashboardCard title="Begin your ascent">
          <p className="text-sm leading-relaxed text-muted">
            Log a workout, a meal, or a match and your character takes shape — attributes,
            class and all.
          </p>
        </DashboardCard>
      </div>
    );
  }

  const trees = buildSkillTrees(progress.stats, new Set(progress.earned.map((e) => e.id)));
  const sherpa = buildSherpa(character, trees);

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <Header />
      <SherpaCard brief={sherpa} />
      <CharacterSheet character={character} level={progress.level} rank={progress.rank} />
      <SkillTrees paths={trees} />
    </div>
  );
}
