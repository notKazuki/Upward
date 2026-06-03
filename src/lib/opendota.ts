// OpenDota — free, key-less Dota 2 stats. https://docs.opendota.com
// Used server-side only (server actions). Account IDs are Steam32 ("account_id").

const BASE = "https://api.opendota.com/api";
const STEAM64_OFFSET = BigInt("76561197960265728");
const STEAM32_MAX = BigInt(4294967295);
const ZERO = BigInt(0);

/**
 * Accepts: a raw Steam32 id, a Steam64 id, or an OpenDota / Dotabuff /
 * Steam-profile URL, and returns the numeric Steam32 account id (string) or
 * null. Steam vanity URLs (steamcommunity.com/id/<name>) can't be resolved
 * without a Steam key, so they return null.
 */
export function parseOpenDotaId(input: string): string | null {
  const s = (input || "").trim();
  if (!s) return null;

  // Pull the last number from a URL path like /players/123 or /profiles/7656…
  const fromUrl = s.match(/(?:players|profiles)\/(\d{1,20})/i);
  const digits = fromUrl ? fromUrl[1] : /^\d{1,20}$/.test(s) ? s : null;
  if (!digits) return null;

  try {
    const n = BigInt(digits);
    // Steam64 → Steam32.
    if (n > STEAM32_MAX) {
      const id32 = n - STEAM64_OFFSET;
      if (id32 <= ZERO || id32 > STEAM32_MAX) return null;
      return id32.toString();
    }
    return n.toString();
  } catch {
    return null;
  }
}

export type OpenDotaMatch = {
  match_id: number;
  player_slot: number;
  radiant_win: boolean;
  duration: number; // seconds
  kills: number;
  deaths: number;
  assists: number;
  start_time: number; // unix seconds
};

/** Returns the player's display name if the account exists, else null. */
export async function fetchOpenDotaProfile(
  accountId: string,
): Promise<{ ok: boolean; name: string | null }> {
  try {
    const res = await fetch(`${BASE}/players/${accountId}`, {
      headers: { accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) return { ok: false, name: null };
    const data = (await res.json()) as { profile?: { personaname?: string } };
    return { ok: true, name: data?.profile?.personaname ?? null };
  } catch {
    return { ok: false, name: null };
  }
}

export async function fetchRecentMatches(
  accountId: string,
): Promise<OpenDotaMatch[] | null> {
  try {
    const res = await fetch(`${BASE}/players/${accountId}/recentMatches`, {
      headers: { accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as OpenDotaMatch[];
    return Array.isArray(data) ? data : [];
  } catch {
    return null;
  }
}

/** Did the player win this match? (slot < 128 ⇒ Radiant.) */
export function won(m: OpenDotaMatch): boolean {
  return m.player_slot < 128 === m.radiant_win;
}
