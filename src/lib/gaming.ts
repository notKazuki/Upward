export type GoalSet = { matches?: number; wins?: number; hours?: number };
export type GameGoals = { daily?: GoalSet; weekly?: GoalSet };

export type Game = {
  id: string;
  slug: string;
  name: string;
  tracker_url: string | null;
  goals: GameGoals;
  created_at: string;
};

export type GameSession = {
  id: string;
  game_id: string;
  played_on: string;
  matches: number;
  wins: number;
  losses: number;
  minutes: number;
  rank: string | null;
  notes: string | null;
  created_at: string;
};

/** Popular games for the picker. No logos (avoids wrong brand art) — we use
 * a monogram tile instead. Users can also add a custom game. */
export const POPULAR_GAMES: { slug: string; name: string }[] = [
  { slug: "valorant", name: "Valorant" },
  { slug: "league-of-legends", name: "League of Legends" },
  { slug: "cs2", name: "Counter-Strike 2" },
  { slug: "overwatch-2", name: "Overwatch 2" },
  { slug: "apex-legends", name: "Apex Legends" },
  { slug: "fortnite", name: "Fortnite" },
  { slug: "rocket-league", name: "Rocket League" },
  { slug: "dota-2", name: "Dota 2" },
  { slug: "marvel-rivals", name: "Marvel Rivals" },
];

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

export function monogram(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "G";
}

const TILE = ["#bc572f", "#d4825a", "#c9a23f", "#7c9473", "#9a6a8a", "#5f8aa8"];
export function tileColor(slug: string): string {
  let h = 0;
  for (let i = 0; i < slug.length; i++) h = (h * 31 + slug.charCodeAt(i)) >>> 0;
  return TILE[h % TILE.length];
}

export function winRate(wins: number, losses: number): number | null {
  const decided = wins + losses;
  if (decided === 0) return null;
  return Math.round((wins / decided) * 100);
}

export function sumSessions(sessions: GameSession[]) {
  return sessions.reduce(
    (a, s) => ({
      matches: a.matches + s.matches,
      wins: a.wins + s.wins,
      losses: a.losses + s.losses,
      minutes: a.minutes + s.minutes,
    }),
    { matches: 0, wins: 0, losses: 0, minutes: 0 },
  );
}

export function pct(value: number, target: number | undefined): number {
  if (!target || target <= 0) return 0;
  return Math.min(100, Math.round((value / target) * 100));
}

export function formatDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}
