// Valorant stats via the unofficial HenrikDev API (https://docs.henrikdev.xyz).
// Riot has no usable public Valorant match API, so this is the only durable
// source. Used server-side only. Requires a free HENRIKDEV_API_KEY (sent in the
// Authorization header). Region is auto-detected from the account lookup, so the
// user only ever supplies a Riot ID (gameName#tagLine).

const BASE = "https://api.henrikdev.xyz";
const PLATFORM = "pc";

/** Distinct failure kinds so the caller can show a useful message. */
export type ValError = "config" | "auth" | "notfound" | "rate" | "unavailable";
export type ValResult<T> = { data: T } | { error: ValError };

/** Parse "gameName#tagLine" (also tolerates a tracker URL or "name tag"). */
export function parseRiotId(input: string): { name: string; tag: string } | null {
  const s = (input || "").trim();
  if (!s) return null;

  // tracker.gg / henrik style URLs end in .../name%23tag or .../name/tag
  const fromUrl = s.match(/(?:valorant\/profile\/riot\/|\/)([^/#]+)(?:%23|#|\/)([A-Za-z0-9]{2,6})\b/i);
  if (fromUrl) return { name: decodeURIComponent(fromUrl[1]).trim(), tag: fromUrl[2].trim() };

  // "name#tag"
  const hash = s.match(/^(.+)#([A-Za-z0-9]{2,6})$/);
  if (hash) return { name: hash[1].trim(), tag: hash[2].trim() };

  return null;
}

function key(): string | null {
  return process.env.HENRIKDEV_API_KEY?.trim() || null;
}

async function call<T>(path: string): Promise<ValResult<T>> {
  const k = key();
  if (!k) return { error: "config" };
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      headers: { accept: "application/json", Authorization: k },
      cache: "no-store",
    });
  } catch {
    return { error: "unavailable" };
  }
  if (res.status === 401 || res.status === 403) return { error: "auth" };
  if (res.status === 404) return { error: "notfound" };
  if (res.status === 429) return { error: "rate" };
  if (!res.ok) return { error: "unavailable" };
  try {
    const body = (await res.json()) as { data?: T };
    if (body?.data === undefined) return { error: "unavailable" };
    return { data: body.data };
  } catch {
    return { error: "unavailable" };
  }
}

export type ValAccount = { puuid: string; region: string; name: string; tag: string };

/** Validate a Riot ID and return its puuid + region (affinity). */
export async function fetchValorantAccount(
  name: string,
  tag: string,
): Promise<ValResult<ValAccount>> {
  const path = `/valorant/v1/account/${encodeURIComponent(name)}/${encodeURIComponent(tag)}`;
  const r = await call<ValAccount>(path);
  if ("error" in r) return r;
  if (!r.data?.puuid || !r.data?.region) return { error: "notfound" };
  return { data: r.data };
}

// --- v4 match shape (only the fields we use) -------------------------------
type V4Map = { id?: string; name?: string };
type V4Queue = { id?: string; name?: string; mode_type?: string };
type V4Metadata = {
  match_id?: string;
  map?: V4Map;
  game_length_in_ms?: number;
  started_at?: string;
  queue?: V4Queue;
  region?: string;
};
type V4Player = {
  puuid?: string;
  name?: string;
  tag?: string;
  team_id?: string;
  agent?: { name?: string };
  tier?: { name?: string };
  stats?: { kills?: number; deaths?: number; assists?: number };
};
type V4Team = { team_id?: string; won?: boolean };
export type V4Match = { metadata?: V4Metadata; players?: V4Player[]; teams?: V4Team[] };

/**
 * Recent stored matches by PUUID (durable id — survives Riot ID changes).
 * `mode` / `size` are filtered server-side, so e.g. mode "competitive" returns
 * the last `size` ranked games rather than the default ~5 mixed-mode window.
 */
export async function fetchValorantMatchesByPuuid(
  region: string,
  puuid: string,
  opts: { mode?: string; size?: number } = {},
): Promise<ValResult<V4Match[]>> {
  const qs = new URLSearchParams();
  if (opts.mode) qs.set("mode", opts.mode);
  if (opts.size) qs.set("size", String(opts.size));
  const q = qs.toString();
  const path = `/valorant/v4/by-puuid/matches/${encodeURIComponent(region)}/${PLATFORM}/${encodeURIComponent(puuid)}${q ? `?${q}` : ""}`;
  const r = await call<V4Match[]>(path);
  if ("error" in r) return r;
  return { data: Array.isArray(r.data) ? r.data : [] };
}

/** True if this match is ranked Competitive. */
export function isCompetitive(m: V4Match): boolean {
  const q = m.metadata?.queue;
  const id = (q?.id || "").toLowerCase();
  const name = (q?.name || "").toLowerCase();
  return id === "competitive" || name === "competitive";
}

export type NormalizedValMatch = {
  matchId: string;
  startedAt: Date;
  minutes: number;
  won: boolean | null; // null = no team result (Deathmatch / FFA modes)
  rank: string | null; // competitive tier, otherwise the mode label
  mode: string;
  notes: string;
};

function titleCase(s: string): string {
  return s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Human label for a match's queue, e.g. "Competitive", "Swiftplay". */
export function modeLabel(m: V4Match): string {
  const q = m.metadata?.queue;
  return (q?.name && q.name.trim()) || (q?.id ? titleCase(q.id.replace(/_/g, " ")) : "") || "Custom";
}

/** The player's current Riot ID (name#tag) as recorded in this match, or null.
 * Lets us auto-refresh a stored handle for free when someone renames. */
export function currentNameTag(m: V4Match, puuid: string): string | null {
  const me = (m.players ?? []).find((p) => p.puuid === puuid);
  if (!me?.name) return null;
  return me.tag ? `${me.name}#${me.tag}` : me.name;
}

export type ValMatchRow = {
  match_id: string;
  region: string | null;
  map: string | null;
  mode: string | null;
  started_at: string | null;
  duration_s: number;
  raw: V4Match;
};

/** Flatten a match into a row for the global valorant_matches archive. */
export function matchSummary(m: V4Match): ValMatchRow | null {
  const match_id = m.metadata?.match_id;
  if (!match_id) return null;
  return {
    match_id,
    region: m.metadata?.region ?? null,
    map: m.metadata?.map?.name ?? null,
    mode: m.metadata?.queue?.id ?? null,
    started_at: m.metadata?.started_at ?? null,
    duration_s: Math.max(0, Math.round((m.metadata?.game_length_in_ms ?? 0) / 1000)),
    raw: m,
  };
}

/**
 * Reduce a v4 match (any mode) to the fields we store. `won` is null for modes
 * without a team result (Deathmatch). Returns null only if unusable (no id or
 * the player isn't in the match).
 */
export function normalizeMatch(m: V4Match, puuid: string): NormalizedValMatch | null {
  const matchId = m.metadata?.match_id;
  if (!matchId) return null;

  const me = (m.players ?? []).find((p) => p.puuid === puuid);
  if (!me) return null;

  const k = me.stats?.kills ?? 0;
  const d = me.stats?.deaths ?? 0;
  const a = me.stats?.assists ?? 0;
  const agent = me.agent?.name ?? "Unknown";
  const map = m.metadata?.map?.name ?? "Unknown";
  const mode = modeLabel(m);

  // Team result, when the mode has one.
  let won: boolean | null = null;
  if (me.team_id) {
    const team = (m.teams ?? []).find((t) => t.team_id === me.team_id);
    if (team && typeof team.won === "boolean") won = team.won;
  }

  return {
    matchId,
    startedAt: new Date(m.metadata?.started_at ?? Date.now()),
    minutes: Math.max(0, Math.round((m.metadata?.game_length_in_ms ?? 0) / 60000)),
    won,
    rank: isCompetitive(m) ? me.tier?.name ?? "Competitive" : mode,
    mode,
    notes: `${agent} · ${map} · ${k}/${d}/${a} KDA`,
  };
}

// --- MMR / Rank Rating -----------------------------------------------------
export type ValMmr = {
  tier: string | null;
  rr: number | null; // 0-100 within the tier
  lastChange: number | null; // RR gained/lost last game
  elo: number | null;
  peakTier: string | null;
  gamesNeeded: number | null; // placement games left before a rating shows
};

/** Current competitive rank + RR for an RR tracker. */
export async function fetchValorantMmr(
  region: string,
  puuid: string,
): Promise<ValResult<ValMmr>> {
  const path = `/valorant/v3/by-puuid/mmr/${encodeURIComponent(region)}/${PLATFORM}/${encodeURIComponent(puuid)}`;
  const r = await call<{
    current?: {
      tier?: { name?: string };
      rr?: number;
      last_change?: number;
      elo?: number;
      games_needed_for_rating?: number;
    };
    peak?: { tier?: { name?: string } };
  }>(path);
  if ("error" in r) return r;
  const cur = r.data?.current ?? {};
  return {
    data: {
      tier: cur.tier?.name ?? null,
      rr: typeof cur.rr === "number" ? cur.rr : null,
      lastChange: typeof cur.last_change === "number" ? cur.last_change : null,
      elo: typeof cur.elo === "number" ? cur.elo : null,
      peakTier: r.data?.peak?.tier?.name ?? null,
      gamesNeeded: typeof cur.games_needed_for_rating === "number" ? cur.games_needed_for_rating : null,
    },
  };
}
