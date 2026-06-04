"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { slugify, type GameGoals } from "@/lib/gaming";
import { ymdInTz } from "@/lib/today";
import {
  fetchOpenDotaProfile,
  fetchRecentMatches,
  parseOpenDotaId,
  won,
} from "@/lib/opendota";
import {
  currentNameTag,
  fetchValorantAccount,
  fetchValorantMatchesByPuuid,
  matchSummary,
  normalizeMatch,
  parseRiotId,
  type NormalizedValMatch,
  type ValError,
  type ValMatchRow,
  type V4Match,
} from "@/lib/valorant";
import { createAdminClient, isAdminConfigured } from "@/lib/supabase/admin";

async function uid() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

export async function addGame(input: {
  name: string;
  slug?: string;
  trackerUrl?: string;
  riotId?: string;
}): Promise<{ error?: string; id?: string }> {
  const { supabase, user } = await uid();
  if (!user) return { error: "Your session expired. Please sign in again." };

  const name = input.name?.trim();
  if (!name) return { error: "Give the game a name." };
  const slug = input.slug?.trim() || slugify(name);

  // Valorant: if a Riot ID is supplied, validate + connect it at creation time
  // so the user gets the "fix it" steps immediately (and we never create a
  // half-broken game). Empty Riot ID is allowed — they can connect later.
  const row: Record<string, unknown> = { user_id: user.id, name, slug };
  if (slug === "valorant" && input.riotId?.trim()) {
    const parsed = parseRiotId(input.riotId);
    if (!parsed) {
      return { error: "Enter your Riot ID as GameName#TAG (e.g. Phoenix#NA1)." };
    }
    const acc = await fetchValorantAccount(parsed.name, parsed.tag);
    if ("error" in acc) return { error: VAL_ERRORS[acc.error] };
    row.provider = "henrikdev";
    row.provider_id = `${acc.data.puuid}|${acc.data.region}`;
    row.provider_label = `${acc.data.name}#${acc.data.tag}`;
  } else {
    const trackerUrl = input.trackerUrl?.trim() || null;
    if (trackerUrl && !/^https?:\/\//i.test(trackerUrl)) {
      return { error: "Tracker link must start with http(s)://" };
    }
    row.tracker_url = trackerUrl;
  }

  const { data, error } = await supabase
    .from("games")
    .insert(row)
    .select("id")
    .single();

  if (error) {
    return {
      error: "Couldn't add the game. Make sure you've run supabase/gaming.sql.",
    };
  }

  revalidatePath("/app/gaming");
  return { id: data.id as string };
}

export async function deleteGame(formData: FormData): Promise<void> {
  const { supabase, user } = await uid();
  if (!user) return;
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await supabase.from("games").delete().eq("id", id).eq("user_id", user.id);
  revalidatePath("/app/gaming");
  redirect("/app/gaming");
}

export async function updateGoals(input: {
  gameId: string;
  goals: GameGoals;
}): Promise<{ error?: string }> {
  const { supabase, user } = await uid();
  if (!user) return { error: "Your session expired." };

  const { error } = await supabase
    .from("games")
    .update({ goals: input.goals })
    .eq("id", input.gameId)
    .eq("user_id", user.id);

  if (error) return { error: "Couldn't save goals." };
  revalidatePath(`/app/gaming/${input.gameId}`);
  revalidatePath("/app/gaming");
  return {};
}

export type SessionState = { ok?: boolean; error?: string; ts?: number };

export async function addSession(
  _prev: SessionState,
  formData: FormData,
): Promise<SessionState> {
  const { supabase, user } = await uid();
  if (!user) return { error: "Your session expired. Please sign in again." };

  const game_id = String(formData.get("game_id") ?? "");
  const played_on = String(formData.get("played_on") ?? "");
  if (!game_id) return { error: "Missing game." };
  if (!played_on) return { error: "Pick a date." };

  const num = (k: string) => {
    const n = Number(String(formData.get(k) ?? "").trim() || "0");
    return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
  };
  const hours = Number(String(formData.get("hours") ?? "").trim() || "0");
  const minutes = Number.isFinite(hours) && hours > 0 ? Math.round(hours * 60) : 0;

  const rank = String(formData.get("rank") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;

  const { error } = await supabase.from("game_sessions").insert({
    user_id: user.id,
    game_id,
    played_on,
    matches: num("matches"),
    wins: num("wins"),
    losses: num("losses"),
    minutes,
    rank,
    notes,
  });

  if (error) return { error: "Couldn't save the session." };

  revalidatePath(`/app/gaming/${game_id}`);
  revalidatePath("/app/gaming");
  return { ok: true, ts: Date.now() };
}

// --- Auto-sync (Dota 2 via OpenDota) --------------------------------------

export async function connectDota(input: {
  gameId: string;
  account: string;
}): Promise<{ ok?: boolean; error?: string; name?: string | null }> {
  const { supabase, user } = await uid();
  if (!user) return { error: "Your session expired." };

  const id = parseOpenDotaId(input.account);
  if (!id) {
    return {
      error:
        "Enter your numeric Dota account ID, or paste your OpenDota / Dotabuff profile link.",
    };
  }
  const prof = await fetchOpenDotaProfile(id);
  if (!prof.ok) {
    return {
      error:
        "Couldn't find that account on OpenDota. Check the ID and make sure your match history is public.",
    };
  }

  const { error } = await supabase
    .from("games")
    .update({ provider: "opendota", provider_id: id })
    .eq("id", input.gameId)
    .eq("user_id", user.id);
  if (error) {
    return { error: "Couldn't save. Make sure you've run supabase/game-sync.sql." };
  }
  revalidatePath(`/app/gaming/${input.gameId}`);
  return { ok: true, name: prof.name };
}

// Min gap between Valorant syncs per game (ranked games run 30-45 min).
const VAL_SYNC_COOLDOWN_MS = 10 * 60 * 1000;

/** Best-effort write of competitive matches into the global archive. Uses the
 * service-role client (bypasses RLS); silently no-ops if it isn't configured or
 * fails, so it can never break a user's own sync. */
async function archiveValorantMatches(matches: V4Match[]): Promise<void> {
  if (!isAdminConfigured || matches.length === 0) return;
  const rows = matches
    .map(matchSummary)
    .filter((r): r is ValMatchRow => r !== null);
  if (!rows.length) return;
  try {
    const admin = createAdminClient();
    await admin
      .from("valorant_matches")
      .upsert(rows, { onConflict: "match_id", ignoreDuplicates: true });
  } catch {
    /* archive is best-effort */
  }
}

const VAL_ERRORS: Record<ValError, string> = {
  config: "Valorant sync isn't configured yet (missing HENRIKDEV_API_KEY).",
  auth: "Valorant sync key is missing or invalid — check HENRIKDEV_API_KEY.",
  notfound:
    "Couldn't find that Riot ID. Use the form GameName#TAG, and make sure you've played Valorant on it.",
  rate: "Valorant data source is rate-limited right now — try again in a minute.",
  unavailable: "Valorant data source is unavailable right now — try again shortly.",
};

export async function connectRiot(input: {
  gameId: string;
  riotId: string;
}): Promise<{ ok?: boolean; error?: string; name?: string | null }> {
  const { supabase, user } = await uid();
  if (!user) return { error: "Your session expired." };

  const parsed = parseRiotId(input.riotId);
  if (!parsed) {
    return { error: "Enter your Riot ID as GameName#TAG (e.g. Phoenix#NA1)." };
  }

  const acc = await fetchValorantAccount(parsed.name, parsed.tag);
  if ("error" in acc) return { error: VAL_ERRORS[acc.error] };

  const { error } = await supabase
    .from("games")
    .update({
      provider: "henrikdev",
      provider_id: `${acc.data.puuid}|${acc.data.region}`,
      provider_label: `${acc.data.name}#${acc.data.tag}`,
    })
    .eq("id", input.gameId)
    .eq("user_id", user.id);
  if (error) {
    return { error: "Couldn't save. Make sure you've run supabase/game-sync.sql." };
  }
  revalidatePath(`/app/gaming/${input.gameId}`);
  return { ok: true, name: `${acc.data.name}#${acc.data.tag}` };
}

/** Re-point a connected Valorant game to a different/corrected Riot ID. */
export async function updateRiotId(input: {
  gameId: string;
  riotId: string;
}): Promise<{ ok?: boolean; error?: string; name?: string | null }> {
  // Same validate-then-store flow as connectRiot; kept separate so the UI can
  // label it "Change Riot ID" on an already-connected game.
  return connectRiot(input);
}

export async function disconnectProvider(
  gameId: string,
): Promise<{ ok?: boolean }> {
  const { supabase, user } = await uid();
  if (!user) return {};
  await supabase
    .from("games")
    .update({ provider: null, provider_id: null, last_synced_at: null })
    .eq("id", gameId)
    .eq("user_id", user.id);
  revalidatePath(`/app/gaming/${gameId}`);
  return { ok: true };
}

export async function syncGame(
  gameId: string,
): Promise<{ ok?: boolean; error?: string; imported?: number; note?: string }> {
  const { supabase, user } = await uid();
  if (!user) return { error: "Your session expired." };

  const { data: game } = await supabase
    .from("games")
    .select("id, provider, provider_id, last_synced_at")
    .eq("id", gameId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!game) return { error: "Game not found." };
  if (!game.provider || !game.provider_id) {
    return { error: "This game isn't connected for sync." };
  }

  const zone = decodeURIComponent((await cookies()).get("tz")?.value || "") || "UTC";

  type Row = {
    user_id: string;
    game_id: string;
    played_on: string;
    matches: number;
    wins: number;
    losses: number;
    minutes: number;
    rank: string | null;
    notes: string;
    external_id: string;
    source: string;
  };

  // Build candidate rows per provider (one match → one row).
  let candidates: Row[];

  if (game.provider === "opendota") {
    const matches = await fetchRecentMatches(game.provider_id as string);
    if (matches === null) {
      return { error: "OpenDota is unavailable right now — try again in a minute." };
    }
    candidates = matches.map((m) => {
      const w = won(m);
      return {
        user_id: user.id,
        game_id: gameId,
        played_on: ymdInTz(zone, new Date(m.start_time * 1000)),
        matches: 1,
        wins: w ? 1 : 0,
        losses: w ? 0 : 1,
        minutes: Math.round(m.duration / 60),
        rank: null,
        notes: `${m.kills}/${m.deaths}/${m.assists} KDA`,
        external_id: String(m.match_id),
        source: "opendota",
      };
    });
  } else if (game.provider === "henrikdev") {
    // Rate-limit guard: HenrikDev allows ~30 req/min shared across all users,
    // and a ranked game lasts 30-45 min, so re-syncing sooner can't find
    // anything new. Within the cooldown we return from cache — zero API calls.
    const last = game.last_synced_at ? new Date(game.last_synced_at).getTime() : 0;
    if (Date.now() - last < VAL_SYNC_COOLDOWN_MS) {
      const mins = Math.ceil((VAL_SYNC_COOLDOWN_MS - (Date.now() - last)) / 60000);
      return {
        ok: true,
        imported: 0,
        note: `Synced recently — check back in ~${mins} min for new matches.`,
      };
    }

    const [puuid, region] = String(game.provider_id).split("|");
    if (!puuid || !region) return { error: "Reconnect this game to sync." };
    // Pull recent matches across all modes (competitive, unrated, swiftplay,
    // deathmatch, etc.) in one call.
    const res = await fetchValorantMatchesByPuuid(region, puuid, { size: 15 });
    if ("error" in res) return { error: VAL_ERRORS[res.error] };

    const all = res.data;

    // Auto-refresh the stored Riot ID from the newest match (handles renames
    // for free — the match data carries their current name#tag).
    const handle = all.length ? currentNameTag(all[0], puuid) : null;
    if (handle) {
      await supabase
        .from("games")
        .update({ provider_label: handle })
        .eq("id", gameId)
        .eq("user_id", user.id);
    }

    // Archive every match into the global dataset (service-role, dedup on
    // match_id). Best-effort — never block the user's own import.
    await archiveValorantMatches(all);

    candidates = all
      .map((m) => normalizeMatch(m, puuid))
      .filter((n): n is NormalizedValMatch => n !== null)
      .map((n) => ({
        user_id: user.id,
        game_id: gameId,
        played_on: ymdInTz(zone, n.startedAt),
        matches: 1,
        // null = no team result (Deathmatch): counts as a match, no W/L.
        wins: n.won === true ? 1 : 0,
        losses: n.won === false ? 1 : 0,
        minutes: n.minutes,
        rank: n.rank,
        notes: n.notes,
        external_id: n.matchId,
        source: "henrikdev",
      }));
  } else {
    return { error: "This game isn't connected for sync." };
  }

  // Dedupe against already-imported matches.
  const { data: existing } = await supabase
    .from("game_sessions")
    .select("external_id")
    .eq("game_id", gameId)
    .not("external_id", "is", null);
  const have = new Set((existing ?? []).map((r) => String(r.external_id)));
  const rows = candidates.filter((r) => !have.has(r.external_id));

  let imported = 0;
  if (rows.length > 0) {
    const { error } = await supabase.from("game_sessions").insert(rows);
    if (error && error.code !== "23505") {
      return {
        error: "Couldn't save synced matches. Make sure you've run supabase/game-sync.sql.",
      };
    }
    if (!error) imported = rows.length;
  }

  await supabase
    .from("games")
    .update({ last_synced_at: new Date().toISOString() })
    .eq("id", gameId)
    .eq("user_id", user.id);
  revalidatePath(`/app/gaming/${gameId}`);
  revalidatePath("/app/gaming");
  return { ok: true, imported };
}

export async function deleteSession(formData: FormData): Promise<void> {
  const { supabase, user } = await uid();
  if (!user) return;
  const id = String(formData.get("id") ?? "");
  const game_id = String(formData.get("game_id") ?? "");
  if (!id) return;
  await supabase
    .from("game_sessions")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);
  revalidatePath(`/app/gaming/${game_id}`);
  revalidatePath("/app/gaming");
}
