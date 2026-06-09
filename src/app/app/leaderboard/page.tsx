import type { Metadata } from "next";
import Link from "next/link";
import DashboardCard from "@/components/dashboard/card";
import Avatar from "@/components/social/avatar";
import { profileName } from "@/lib/social";
import {
  buildLeaderboard,
  sortLeaderboard,
  type LeaderboardMetric,
} from "@/lib/leaderboard";

export const metadata: Metadata = { title: "Leaderboard — Upward" };

const TABS: { id: LeaderboardMetric; label: string }[] = [
  { id: "xp", label: "Weekly XP" },
  { id: "streak", label: "Streak" },
  { id: "workouts", label: "Workouts" },
  { id: "winrate", label: "Win rate" },
];

const MEDAL = ["#c9a23f", "#9aa3ad", "#b07a46"];

export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<{ by?: string }>;
}) {
  const sp = await searchParams;
  const metric: LeaderboardMetric = (TABS.find((t) => t.id === sp.by)?.id ?? "xp") as LeaderboardMetric;

  const rows = await buildLeaderboard();

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-[2rem] font-normal tracking-tight text-ink">
            Leaderboard
          </h1>
          <p className="mt-1 text-sm text-muted">
            You and your friends, this week. XP comes from real logged activity.
          </p>
        </div>
        <Link
          href="/app/friends"
          className="cursor-pointer rounded-full border border-line bg-paper-bright px-3.5 py-1.5 text-sm font-medium text-ink-soft transition-colors hover:border-line-strong hover:text-ink"
        >
          Friends
        </Link>
      </div>

      {rows === null ? (
        <DashboardCard title="One step left">
          <p className="text-sm leading-relaxed text-muted">
            Run <code className="text-ink">supabase/social.sql</code> and make sure{" "}
            <code className="text-ink">SUPABASE_SERVICE_ROLE_KEY</code> is set, then refresh.
          </p>
        </DashboardCard>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            {TABS.map((t) => {
              const on = t.id === metric;
              return (
                <Link
                  key={t.id}
                  href={`/app/leaderboard?by=${t.id}`}
                  className={`cursor-pointer rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors ${
                    on
                      ? "border-ember bg-ember/10 text-ink"
                      : "border-line bg-paper-bright text-ink-soft hover:border-ember/50"
                  }`}
                >
                  {t.label}
                </Link>
              );
            })}
          </div>

          {rows.length <= 1 ? (
            <div className="rounded-2xl border border-line bg-card px-6 py-12 text-center">
              <p className="font-display text-xl text-ink">It&rsquo;s just you so far</p>
              <p className="mx-auto mt-1 max-w-sm text-sm text-muted">
                Add friends and the weekly race shows up here.{" "}
                <Link href="/app/friends" className="font-medium text-ember hover:text-ink">
                  Find friends →
                </Link>
              </p>
            </div>
          ) : (
            <ul className="space-y-2">
              {sortLeaderboard(rows, metric).map((r, i) => {
                const value =
                  metric === "streak"
                    ? `${r.streak}d streak`
                    : metric === "workouts"
                      ? `${r.workouts7} workout${r.workouts7 === 1 ? "" : "s"}`
                      : metric === "winrate"
                        ? r.winRate7 !== null
                          ? `${r.winRate7}% · ${r.matches7} games`
                          : "no matches"
                        : `${r.weeklyXp.toLocaleString()} XP`;
                return (
                  <li
                    key={r.profile.id}
                    className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${
                      r.isMe ? "border-ember/50 bg-ember/5" : "border-line bg-card"
                    }`}
                  >
                    <span
                      className="grid size-7 shrink-0 place-items-center rounded-full font-display text-sm"
                      style={
                        i < 3
                          ? { backgroundColor: `${MEDAL[i]}22`, color: MEDAL[i] }
                          : { backgroundColor: "var(--color-line)", color: "var(--color-faint, #a89e8f)" }
                      }
                    >
                      {i + 1}
                    </span>
                    <Link
                      href={r.profile.username ? `/app/u/${r.profile.username}` : "#"}
                      className="flex min-w-0 flex-1 items-center gap-3"
                    >
                      <Avatar profile={r.profile} size={38} />
                      <span className="min-w-0">
                        <span className="block truncate font-medium text-ink">
                          {profileName(r.profile)}
                          {r.isMe && <span className="ml-1.5 text-xs text-ember">you</span>}
                        </span>
                        <span className="block truncate text-xs text-muted">
                          {r.weeklyXp.toLocaleString()} XP · {r.streak}d streak · {r.workouts7} workouts
                        </span>
                      </span>
                    </Link>
                    <span className="shrink-0 text-sm font-medium text-ink-soft">{value}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
