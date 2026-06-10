import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Avatar from "@/components/social/avatar";
import ProfileActions from "@/components/social/profile-actions";
import RankHero from "@/components/social/rank-hero";
import AchievementBadge from "@/components/social/achievement-badge";
import { currentUser } from "@/lib/auth";
import { canView, profileName } from "@/lib/social";
import {
  profileByUsername,
  relationshipTo,
  buildSharedStats,
  buildSharedDetails,
} from "@/lib/social-data";
import { moodMeta } from "@/lib/journal";
import { dayColor, displayDay } from "@/lib/workouts";
import { getProfileProgress } from "@/lib/progress-data";
import { ACHIEVEMENTS } from "@/lib/achievements";

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

  // Rank + achievements (privacy-gated, computed via service role).
  const showRank = canView(profile.privacy, "rank", rel);
  const showAch = canView(profile.privacy, "achievements", rel);
  const progress = showRank || showAch ? await getProfileProgress(profile.id) : null;
  const earnedSet = new Map((progress?.earned ?? []).map((e) => [e.id, e.earned_on]));
  const earnedAchievements = progress
    ? ACHIEVEMENTS.filter((a) => earnedSet.has(a.id))
    : [];

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

  // Detail feeds (recent workouts/meals/goals/journal) — each privacy-gated.
  const details = await buildSharedDetails(profile, rel);
  const hasDetails =
    (details.workouts?.length ?? 0) > 0 ||
    (details.mealDays?.length ?? 0) > 0 ||
    (details.goalsList?.length ?? 0) > 0 ||
    (details.journal?.length ?? 0) > 0;

  const hasRankShown = showRank && progress !== null;
  const hasAchShown = showAch && earnedAchievements.length > 0;
  const nothingShared =
    cards.length === 0 && !hasRankShown && !hasAchShown && !hasDetails && rel !== "self";

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
            username={profile.username}
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

      {/* Rank & level */}
      {hasRankShown && progress && <RankHero progress={progress} />}

      {/* Shared stat sections */}
      {cards.length > 0 && (
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

      {/* Recent workouts (with sets) */}
      {details.workouts && details.workouts.length > 0 && (
        <div className="rounded-2xl border border-line bg-card p-5">
          <h2 className="mb-3 font-display text-lg text-ink">Recent workouts</h2>
          <ul className="space-y-2.5">
            {details.workouts.map((w, i) => (
              <li key={i} className="rounded-xl border border-line bg-paper-bright px-4 py-3">
                <div className="mb-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs">
                  <span className="inline-flex items-center gap-1.5 font-medium text-ink-soft">
                    <span className="inline-block size-2 rounded-full" style={{ backgroundColor: dayColor(w.category) }} />
                    {displayDay(w.category)}
                  </span>
                  <span className="text-faint">
                    {new Date(`${w.performed_on}T00:00:00`).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
                  </span>
                  {w.duration_min != null && <span className="text-faint">· {w.duration_min}m</span>}
                </div>
                <p className="truncate font-medium text-ink">{w.title}</p>
                {w.exercises.length > 0 && (
                  <div className="mt-1 space-y-0.5">
                    {w.exercises.map((e) => (
                      <p key={e.exercise} className="text-xs text-muted">
                        <span className="text-ink-soft">{e.exercise}</span>{" "}
                        {e.sets.join(", ")}
                      </p>
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Recent meals + goals side by side when both shared */}
      {((details.mealDays?.length ?? 0) > 0 || (details.goalsList?.length ?? 0) > 0) && (
        <div className="grid gap-4 lg:grid-cols-2">
          {details.mealDays && details.mealDays.length > 0 && (
            <div className="rounded-2xl border border-line bg-card p-5">
              <h2 className="mb-3 font-display text-lg text-ink">Recent meals</h2>
              <ul className="space-y-2">
                {details.mealDays.map((d) => (
                  <li key={d.eaten_on} className="flex items-center justify-between gap-3 rounded-xl border border-line bg-paper-bright px-4 py-2.5 text-sm">
                    <span className="text-ink-soft">
                      {new Date(`${d.eaten_on}T00:00:00`).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
                      <span className="text-faint"> · {d.items} item{d.items === 1 ? "" : "s"}</span>
                    </span>
                    <span className="shrink-0 text-muted">
                      {d.calories.toLocaleString()} kcal · P{d.protein}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {details.goalsList && details.goalsList.length > 0 && (
            <div className="rounded-2xl border border-line bg-card p-5">
              <h2 className="mb-3 font-display text-lg text-ink">Goals</h2>
              <ul className="space-y-3">
                {details.goalsList.map((g, i) => (
                  <li key={i}>
                    <div className="mb-1 flex justify-between gap-3 text-sm">
                      <span className="truncate text-ink-soft">{g.title}</span>
                      <span className="shrink-0 text-muted">{g.pct}%</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-line">
                      <div className="h-full rounded-full bg-ember transition-[width] duration-500" style={{ width: `${g.pct}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Journal (text + mood only) */}
      {details.journal && details.journal.length > 0 && (
        <div className="rounded-2xl border border-line bg-card p-5">
          <h2 className="mb-3 font-display text-lg text-ink">Journal</h2>
          <ul className="space-y-3">
            {details.journal.map((e, i) => {
              const mood = moodMeta(e.mood);
              return (
                <li key={i} className="rounded-xl border border-line bg-paper-bright px-4 py-3">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="font-medium text-ink-soft">
                      {new Date(`${e.entry_date}T00:00:00`).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
                    </span>
                    {mood && (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-paper px-2 py-0.5 font-medium text-ink-soft">
                        <span className="inline-block size-2 rounded-full" style={{ backgroundColor: mood.color }} />
                        {mood.label}
                      </span>
                    )}
                  </div>
                  {e.body && (
                    <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-ink-soft">
                      {e.body}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Achievements */}
      {hasAchShown && (
        <div className="rounded-2xl border border-line bg-card p-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="font-display text-lg text-ink">Achievements</h2>
            <span className="text-sm text-muted">{earnedAchievements.length} earned</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {earnedAchievements.map((a) => (
              <AchievementBadge key={a.id} achievement={a} earned earnedOn={earnedSet.get(a.id)} />
            ))}
          </div>
        </div>
      )}

      {/* Private notice */}
      {nothingShared && (
        <div className="rounded-2xl border border-line bg-card px-6 py-12 text-center">
          <p className="font-display text-xl text-ink">This profile is private</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted">
            {rel === "friend"
              ? `${name} hasn't shared anything with friends yet.`
              : `Become friends with ${name} to see what they choose to share.`}
          </p>
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
