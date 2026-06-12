import type { Metadata } from "next";
import Link from "next/link";
import { profileByUsername } from "@/lib/social-data";
import { canView, profileName } from "@/lib/social";
import { getProfileProgress } from "@/lib/progress-data";
import { getCharacterFor } from "@/lib/character-data";
import { titleLabelOf } from "@/lib/cosmetics";
import { ATTR_ACCENT } from "@/lib/character";
import { cardSvg, type CardData } from "@/lib/character-card";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  const profile = await profileByUsername(username);
  const name = profile ? profileName(profile) : "A climber";
  return {
    title: `${name} on Upward`,
    description: "Their real life, as an RPG. Climb in real life.",
  };
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 px-5 py-12">
      <div className="w-full max-w-md space-y-6">{children}</div>
    </div>
  );
}

function Join({ lead }: { lead: string }) {
  return (
    <div className="text-center">
      <p className="text-sm text-muted">{lead}</p>
      <Link
        href="/"
        className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-full bg-ember px-5 py-3 text-sm font-semibold text-paper transition-opacity hover:opacity-90"
      >
        Start your ascent — free
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M5 12h14M13 6l6 6-6 6" />
        </svg>
      </Link>
    </div>
  );
}

export default async function PublicCardPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const profile = await profileByUsername(username);

  if (!profile) {
    return (
      <Shell>
        <div className="rounded-2xl border border-line bg-card p-8 text-center">
          <h1 className="font-display text-2xl text-ink">No climber here yet</h1>
          <p className="mt-2 text-sm text-muted">
            We couldn&rsquo;t find <span className="text-ink-soft">@{username}</span> on Upward.
          </p>
        </div>
        <Join lead="Upward turns your real life into a mountain to climb." />
      </Shell>
    );
  }

  const name = profileName(profile);
  const shareable = canView(profile.privacy, "rank", "stranger");

  if (!shareable) {
    return (
      <Shell>
        <div className="rounded-2xl border border-line bg-card p-8 text-center">
          <h1 className="font-display text-2xl text-ink">{name} keeps their card private</h1>
          <p className="mt-2 text-sm text-muted">
            This climber hasn&rsquo;t made their rank public yet.
          </p>
        </div>
        <Join lead="You could be on the mountain too." />
      </Shell>
    );
  }

  const [character, progress] = await Promise.all([
    getCharacterFor(profile.id),
    getProfileProgress(profile.id),
  ]);

  if (!character || !progress) {
    return (
      <Shell>
        <div className="rounded-2xl border border-line bg-card p-8 text-center">
          <h1 className="font-display text-2xl text-ink">{name}&rsquo;s card isn&rsquo;t ready</h1>
          <p className="mt-2 text-sm text-muted">Check back once they&rsquo;ve logged a little more.</p>
        </div>
        <Join lead="Start your own climb in the meantime." />
      </Shell>
    );
  }

  const cardData: CardData = {
    name,
    username: profile.username,
    className: character.klass.name,
    tagline: character.klass.tagline,
    level: progress.level.level,
    rankName: progress.rank.name,
    rankColor: progress.rank.color,
    power: character.power,
    title: titleLabelOf(profile.cosmetics?.title),
    attributes: character.attributes.map((a) => ({
      abbr: a.abbr,
      label: a.label,
      score: a.score,
      color: ATTR_ACCENT[a.id],
    })),
  };

  return (
    <Shell>
      <div
        className="overflow-hidden rounded-2xl [&>svg]:block [&>svg]:h-auto [&>svg]:w-full"
        dangerouslySetInnerHTML={{ __html: cardSvg(cardData) }}
      />
      <Join lead={`${name} is climbing in real life. Your move.`} />
    </Shell>
  );
}
