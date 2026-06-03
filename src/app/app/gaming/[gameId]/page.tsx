import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import DashboardCard from "@/components/dashboard/card";
import Icon from "@/components/icons";
import GoalsEditor from "@/components/gaming/goals-editor";
import SessionForm from "@/components/gaming/session-form";
import WinrateChart from "@/components/gaming/winrate-chart-lazy";
import { createClient } from "@/lib/supabase/server";
import {
  formatDate,
  sumSessions,
  winRate,
  type Game,
  type GameSession,
} from "@/lib/gaming";
import GameTile from "@/components/gaming/game-tile";
import GameSync from "@/components/gaming/game-sync";
import { serverToday, serverWeekStart } from "@/lib/server-today";
import { deleteGame, deleteSession } from "../actions";

export const metadata: Metadata = { title: "Game — Upward" };

export default async function GameDetailPage({
  params,
}: {
  params: Promise<{ gameId: string }>;
}) {
  const { gameId } = await params;
  const supabase = await createClient();

  const { data: game } = await supabase
    .from("games")
    .select("*")
    .eq("id", gameId)
    .maybeSingle();
  if (!game) redirect("/app/gaming");
  const g = game as Game;

  const { data: sData } = await supabase
    .from("game_sessions")
    .select("*")
    .eq("game_id", gameId)
    .order("played_on", { ascending: false })
    .order("created_at", { ascending: false });
  const sessions = (sData ?? []) as GameSession[];

  const today = await serverToday();
  const weekStart = await serverWeekStart();
  const todayT = sumSessions(sessions.filter((s) => s.played_on === today));
  const weekT = sumSessions(sessions.filter((s) => s.played_on >= weekStart));
  const allT = sumSessions(sessions);
  const wr = winRate(allT.wins, allT.losses);

  const trend = [...sessions]
    .reverse()
    .filter((s) => s.wins + s.losses > 0)
    .slice(-12)
    .map((s) => ({
      label: formatDate(s.played_on).replace(/^\w+,\s*/, ""),
      winRate: winRate(s.wins, s.losses) ?? 0,
    }));

  const stats = [
    { label: "This week", value: `${weekT.matches}`, suffix: "matches" },
    {
      label: "Win rate",
      value: wr !== null ? `${wr}%` : "—",
      suffix: "all time",
    },
    { label: "Sessions", value: `${sessions.length}`, suffix: "logged" },
    {
      label: "Hours",
      value: `${(allT.minutes / 60).toFixed(1)}`,
      suffix: "all time",
    },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/app/gaming"
            className="grid size-8 cursor-pointer place-items-center rounded-lg text-muted transition-colors hover:bg-card hover:text-ink"
            aria-label="Back to games"
          >
            <Icon name="chevronLeft" size={20} />
          </Link>
          <GameTile slug={g.slug} name={g.name} size={44} />
          <h1 className="font-display text-[1.9rem] font-normal tracking-tight text-ink">
            {g.name}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          {g.tracker_url && (
            <a
              href={g.tracker_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full border border-line bg-paper-bright px-3.5 py-1.5 text-sm font-medium text-ink-soft transition-colors hover:border-line-strong hover:text-ink"
            >
              View full stats <Icon name="external" size={14} />
            </a>
          )}
          <form action={deleteGame}>
            <input type="hidden" name="id" value={g.id} />
            <button
              type="submit"
              aria-label="Delete game"
              className="grid size-9 cursor-pointer place-items-center rounded-lg text-faint transition-colors hover:bg-card hover:text-danger"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M3 6h18M8 6V4h8v2m-9 0 1 14h8l1-14" /></svg>
            </button>
          </form>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl border border-line bg-card p-5">
            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-faint">
              {s.label}
            </span>
            <p className="mt-3 font-display text-3xl text-ink">{s.value}</p>
            <p className="text-xs text-muted">{s.suffix}</p>
          </div>
        ))}
      </div>

      {g.slug === "dota-2" && (
        <DashboardCard title="Auto-sync">
          <GameSync
            gameId={g.id}
            provider={g.provider ?? null}
            providerId={g.provider_id ?? null}
            lastSyncedAt={g.last_synced_at ?? null}
          />
        </DashboardCard>
      )}

      <div className="grid gap-5 lg:grid-cols-5">
        <div className="space-y-5 lg:col-span-2">
          <DashboardCard title="Goals">
            <GoalsEditor
              gameId={g.id}
              goals={g.goals ?? {}}
              today={{ ...todayT, hours: todayT.minutes / 60 }}
              week={{ ...weekT, hours: weekT.minutes / 60 }}
            />
          </DashboardCard>

          <DashboardCard title="Log a session">
            <SessionForm gameId={g.id} />
          </DashboardCard>
        </div>

        <div className="space-y-5 lg:col-span-3">
          {trend.length >= 2 && (
            <DashboardCard title="Win rate trend">
              <WinrateChart data={trend} />
            </DashboardCard>
          )}

          <DashboardCard title="Sessions">
            {sessions.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-12 text-center">
                <p className="font-display text-xl text-ink">No sessions yet</p>
                <p className="max-w-xs text-sm text-muted">
                  Log your first session on the left to start tracking your
                  progress.
                </p>
              </div>
            ) : (
              <ul className="space-y-2.5">
                {sessions.map((s) => {
                  const sr = winRate(s.wins, s.losses);
                  return (
                    <li
                      key={s.id}
                      className="flex items-start justify-between gap-4 rounded-xl border border-line bg-paper-bright px-4 py-3"
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs">
                          <span className="font-medium text-ink-soft">
                            {formatDate(s.played_on)}
                          </span>
                          {s.rank && (
                            <span className="rounded-full bg-ember-wash px-2 py-0.5 text-ember">
                              {s.rank}
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-sm text-ink">
                          {s.matches} match{s.matches === 1 ? "" : "es"}
                          {s.wins + s.losses > 0 && (
                            <span className="text-muted">
                              {" "}
                              · {s.wins}W {s.losses}L
                              {sr !== null ? ` · ${sr}%` : ""}
                            </span>
                          )}
                          {s.minutes > 0 && (
                            <span className="text-muted">
                              {" "}
                              · {(s.minutes / 60).toFixed(1)}h
                            </span>
                          )}
                        </p>
                        {s.notes && (
                          <p className="mt-0.5 text-sm leading-relaxed text-muted">
                            {s.notes}
                          </p>
                        )}
                      </div>

                      <form action={deleteSession}>
                        <input type="hidden" name="id" value={s.id} />
                        <input type="hidden" name="game_id" value={g.id} />
                        <button
                          type="submit"
                          aria-label="Delete session"
                          className="grid size-8 shrink-0 cursor-pointer place-items-center rounded-lg text-faint transition-colors hover:bg-card hover:text-danger"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M3 6h18M8 6V4h8v2m-9 0 1 14h8l1-14" /></svg>
                        </button>
                      </form>
                    </li>
                  );
                })}
              </ul>
            )}
          </DashboardCard>
        </div>
      </div>
    </div>
  );
}
