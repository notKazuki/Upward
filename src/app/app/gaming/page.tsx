import type { Metadata } from "next";
import Link from "next/link";
import DashboardCard from "@/components/dashboard/card";
import AddGame from "@/components/gaming/add-game";
import { createClient } from "@/lib/supabase/server";
import {
  monogram,
  pct,
  startOfWeekISO,
  tileColor,
  winRate,
  type Game,
} from "@/lib/gaming";

export const metadata: Metadata = { title: "Gaming — Upward" };

type WeekRow = { game_id: string; matches: number; wins: number; losses: number };

export default async function GamingPage() {
  const supabase = await createClient();
  const { data: gamesData, error } = await supabase
    .from("games")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) {
    return (
      <div className="mx-auto max-w-7xl space-y-5">
        <Header />
        <DashboardCard title="One step left">
          <p className="text-sm leading-relaxed text-muted">
            Run <code className="text-ink">supabase/gaming.sql</code> in Supabase
            → <b>SQL Editor</b>, then refresh this page.
          </p>
        </DashboardCard>
      </div>
    );
  }

  const games = (gamesData ?? []) as Game[];

  // This week's sessions for all games, grouped.
  const weekStart = startOfWeekISO();
  const { data: weekData } = await supabase
    .from("game_sessions")
    .select("game_id, matches, wins, losses")
    .gte("played_on", weekStart);
  const byGame = new Map<string, { matches: number; wins: number; losses: number }>();
  for (const r of (weekData ?? []) as WeekRow[]) {
    const cur = byGame.get(r.game_id) ?? { matches: 0, wins: 0, losses: 0 };
    cur.matches += r.matches;
    cur.wins += r.wins;
    cur.losses += r.losses;
    byGame.set(r.game_id, cur);
  }

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <Header />

      {games.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {games.map((g) => {
            const wk = byGame.get(g.id) ?? { matches: 0, wins: 0, losses: 0 };
            const wr = winRate(wk.wins, wk.losses);
            const target = g.goals?.weekly?.matches;
            return (
              <Link
                key={g.id}
                href={`/app/gaming/${g.id}`}
                className="group rounded-2xl border border-line bg-card p-5 transition-colors hover:border-line-strong"
              >
                <div className="flex items-center gap-3">
                  <span
                    className="grid size-11 shrink-0 place-items-center rounded-xl text-base font-semibold text-paper-bright"
                    style={{ backgroundColor: tileColor(g.slug) }}
                  >
                    {monogram(g.name)}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-display text-lg text-ink">
                      {g.name}
                    </p>
                    <p className="text-xs text-muted">
                      {wk.matches} match{wk.matches === 1 ? "" : "es"} this week
                      {wr !== null ? ` · ${wr}% WR` : ""}
                    </p>
                  </div>
                </div>

                {target ? (
                  <div className="mt-4">
                    <div className="mb-1 flex justify-between text-xs text-muted">
                      <span>Weekly matches</span>
                      <span>
                        {wk.matches} / {target}
                      </span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-line">
                      <div
                        className="h-full rounded-full bg-ember transition-[width] duration-500"
                        style={{ width: `${pct(wk.matches, target)}%` }}
                      />
                    </div>
                  </div>
                ) : (
                  <p className="mt-4 text-xs text-faint">
                    Open to set goals &amp; log sessions →
                  </p>
                )}
              </Link>
            );
          })}
        </div>
      )}

      <DashboardCard title={games.length ? "Add another game" : "Add a game"}>
        {games.length === 0 && (
          <p className="mb-4 text-sm text-muted">
            Pick a game to start tracking sessions, goals, and your win rate.
          </p>
        )}
        <AddGame />
      </DashboardCard>
    </div>
  );
}

function Header() {
  return (
    <div>
      <h1 className="font-display text-[2rem] font-normal tracking-tight text-ink">
        Gaming
      </h1>
      <p className="mt-1 text-sm text-muted">
        Track your games, set goals, and watch your win rate climb.
      </p>
    </div>
  );
}
