import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Avatar from "@/components/social/avatar";
import ProfileActions from "@/components/social/profile-actions";
import { currentUser } from "@/lib/auth";
import { profileName } from "@/lib/social";
import {
  profileByUsername,
  relationshipTo,
  buildSharedStats,
} from "@/lib/social-data";

export const metadata: Metadata = { title: "Profile — Upward" };

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const me = await currentUser();
  const profile = await profileByUsername(username);
  if (!profile) notFound();

  const info = await relationshipTo(me!.id, profile.id);
  if (info.targetBlockedViewer) notFound(); // hidden from people they've blocked

  const rel = info.rel;
  const stats = await buildSharedStats(profile, rel);
  const name = profileName(profile);

  const memberSince = stats.memberSince
    ? new Date(stats.memberSince).toLocaleDateString(undefined, { month: "long", year: "numeric" })
    : null;

  const cards: { label: string; lines: string[] }[] = [];
  if (stats.stats) {
    cards.push({
      label: "Activity",
      lines: [
        `${stats.stats.streak}-day streak`,
        `${stats.stats.activeDays30} active days (30d)`,
      ],
    });
  }
  if (stats.workouts) {
    cards.push({
      label: "Workouts",
      lines: [
        `${stats.workouts.total} logged`,
        `~${stats.workouts.perWeek}/week`,
        ...(stats.workouts.topDay ? [`Most: ${stats.workouts.topDay}`] : []),
      ],
    });
  }
  if (stats.nutrition) {
    cards.push({
      label: "Nutrition",
      lines: [
        `Logged ${stats.nutrition.loggingRatePct}% of days`,
        ...(stats.nutrition.avgCalories ? [`~${stats.nutrition.avgCalories.toLocaleString()} kcal/day`] : []),
      ],
    });
  }
  if (stats.gaming) {
    cards.push({
      label: "Gaming",
      lines: [
        `${stats.gaming.games} game${stats.gaming.games === 1 ? "" : "s"}`,
        `${stats.gaming.matches} matches`,
        ...(stats.gaming.winRate !== null ? [`${stats.gaming.winRate}% win rate`] : []),
      ],
    });
  }
  if (stats.goals) {
    cards.push({
      label: "Goals",
      lines: [
        `${stats.goals.active} active`,
        `${stats.goals.completed} completed`,
      ],
    });
  }

  const nothingShared = cards.length === 0 && rel !== "self";

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Link href="/app/friends" className="inline-flex items-center gap-1 text-sm text-muted transition-colors hover:text-ink">
        ← Friends
      </Link>

      {/* Header */}
      <div className="rounded-2xl border border-line bg-card p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-4">
            <Avatar profile={profile} size={72} />
            <div className="min-w-0">
              <h1 className="font-display text-2xl text-ink">{name}</h1>
              {profile.username && <p className="text-sm text-muted">@{profile.username}</p>}
              {memberSince && <p className="mt-0.5 text-xs text-faint">Member since {memberSince}</p>}
            </div>
          </div>
          <ProfileActions
            targetId={profile.id}
            rel={rel}
            outgoingPending={info.outgoingPending}
            incomingPending={info.incomingPending}
            viewerBlockedTarget={info.viewerBlockedTarget}
          />
        </div>
        {profile.bio && (
          <p className="mt-4 whitespace-pre-wrap text-[0.95rem] leading-relaxed text-ink-soft">
            {profile.bio}
          </p>
        )}
      </div>

      {/* Shared sections */}
      {nothingShared ? (
        <div className="rounded-2xl border border-line bg-card px-6 py-12 text-center">
          <p className="font-display text-xl text-ink">This profile is private</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted">
            {rel === "friend"
              ? `${name} hasn't shared anything with friends yet.`
              : `Become friends with ${name} to see what they choose to share.`}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((c) => (
            <div key={c.label} className="rounded-2xl border border-line bg-card p-5">
              <span className="text-xs font-semibold uppercase tracking-[0.12em] text-faint">
                {c.label}
              </span>
              <ul className="mt-3 space-y-1">
                {c.lines.map((l, i) => (
                  <li key={i} className={i === 0 ? "font-display text-xl text-ink" : "text-sm text-muted"}>
                    {l}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      {rel === "self" && (
        <p className="text-center text-sm text-muted">
          This is your public profile.{" "}
          <Link href="/app/settings" className="font-medium text-ember hover:text-ink">
            Manage what you share →
          </Link>
        </p>
      )}
    </div>
  );
}
