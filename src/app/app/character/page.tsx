import type { Metadata } from "next";
import DashboardCard from "@/components/dashboard/card";
import CharacterSheet from "@/components/character/character-sheet";
import SkillTrees from "@/components/character/skill-trees";
import SherpaCard from "@/components/character/sherpa-card";
import SherpaChat from "@/components/character/sherpa-chat";
import Ascent from "@/components/character/ascent";
import Loadout from "@/components/character/loadout";
import CharacterCard from "@/components/character/character-card";
import { isAiSherpaConfigured } from "@/lib/sherpa-ai";
import { ATTR_ACCENT } from "@/lib/character";
import type { CardData } from "@/lib/character-card";
import { getCharacter } from "@/lib/character-data";
import { getOwnProgress } from "@/lib/progress-data";
import { buildSkillTrees } from "@/lib/skill-trees";
import { buildSherpa } from "@/lib/sherpa";
import { resolveCosmetics, type Cosmetics } from "@/lib/cosmetics";
import { createClient } from "@/lib/supabase/server";
import { currentUser } from "@/lib/auth";

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
  const supabase = await createClient();
  const user = await currentUser();
  const [character, progress, cosmeticsRow] = await Promise.all([
    getCharacter(),
    getOwnProgress(),
    user
      ? supabase
          .from("profiles")
          .select("cosmetics, avatar_url, display_name, username")
          .eq("id", user.id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);

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

  const earnedIds = progress.earned.map((e) => e.id);
  const profileRow = (cosmeticsRow?.data ?? null) as {
    cosmetics?: Cosmetics | null;
    avatar_url?: string | null;
    display_name?: string | null;
    username?: string | null;
  } | null;
  const resolved = resolveCosmetics(profileRow?.cosmetics ?? null, progress.level.level, new Set(earnedIds));
  // Only override the class-coloured crest when a non-default accent is equipped.
  const accentColor = resolved.accentId === "ember" ? undefined : resolved.accentColor;
  const name = profileRow?.display_name || profileRow?.username || "You";

  const cardData: CardData = {
    name,
    username: profileRow?.username ?? null,
    className: character.klass.name,
    tagline: character.klass.tagline,
    level: progress.level.level,
    rankName: progress.rank.name,
    rankColor: progress.rank.color,
    power: character.power,
    title: resolved.title?.label ?? null,
    attributes: character.attributes.map((a) => ({
      abbr: a.abbr,
      label: a.label,
      score: a.score,
      color: ATTR_ACCENT[a.id],
    })),
  };

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <Header />
      <Ascent level={progress.level} />
      <SherpaCard brief={sherpa} />
      <SherpaChat configured={isAiSherpaConfigured} />
      <CharacterSheet
        character={character}
        level={progress.level}
        rank={progress.rank}
        accentColor={accentColor}
        title={resolved.title?.label ?? null}
      />
      <SkillTrees paths={trees} />
      <Loadout
        level={progress.level.level}
        earnedIds={earnedIds}
        accentId={resolved.accentId}
        titleId={resolved.title?.id ?? null}
        frameId={resolved.frameId}
        avatarUrl={profileRow?.avatar_url ?? null}
        name={name}
      />
      <CharacterCard data={cardData} />
    </div>
  );
}
