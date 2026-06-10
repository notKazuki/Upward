"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient, isAdminConfigured } from "@/lib/supabase/admin";
import { currentUser } from "@/lib/auth";
import { notifyUser } from "@/lib/notify";
import {
  SECTIONS,
  VISIBILITY_OPTIONS,
  type PrivacyMap,
  type PublicProfile,
  type SectionId,
  type Visibility,
} from "@/lib/social";

export type UserStatus = "self" | "friend" | "outgoing" | "incoming" | "none";
export type UserResult = PublicProfile & { status: UserStatus };

const PCOLS = "id, username, display_name, avatar_url, bio";

/** The current user's public-facing name + profile link, for notifications. */
async function myIdentity(meId: string): Promise<{ name: string; href?: string }> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("username, display_name")
    .eq("id", meId)
    .maybeSingle();
  const username = (data?.username as string | null) ?? null;
  const name = (data?.display_name as string | null) || username || "Someone";
  return { name, href: username ? `/app/u/${username}` : "/app/friends" };
}

/** Search members by username. Excludes self and anyone blocked either way. */
export async function searchUsers(query: string): Promise<UserResult[]> {
  const me = await currentUser();
  if (!me) return [];
  const q = query.trim();
  if (q.length < 2 || !isAdminConfigured) return [];

  const supabase = await createClient();
  const admin = createAdminClient();

  const [found, friendships, myBlocks, blockedMe] = await Promise.all([
    admin.from("profiles").select(PCOLS).ilike("username", `%${q}%`).neq("id", me.id).limit(12),
    supabase.from("friendships").select("*").or(`requester_id.eq.${me.id},addressee_id.eq.${me.id}`),
    supabase.from("blocks").select("blocked_id").eq("blocker_id", me.id),
    admin.from("blocks").select("blocker_id").eq("blocked_id", me.id),
  ]);

  const blockedIds = new Set<string>([
    ...((myBlocks.data ?? []) as { blocked_id: string }[]).map((b) => b.blocked_id),
    ...((blockedMe.data ?? []) as { blocker_id: string }[]).map((b) => b.blocker_id),
  ]);
  const fr = (friendships.data ?? []) as {
    requester_id: string;
    addressee_id: string;
    status: string;
  }[];

  const statusFor = (id: string): UserStatus => {
    const row = fr.find(
      (f) =>
        (f.requester_id === me.id && f.addressee_id === id) ||
        (f.requester_id === id && f.addressee_id === me.id),
    );
    if (!row) return "none";
    if (row.status === "accepted") return "friend";
    return row.requester_id === me.id ? "outgoing" : "incoming";
  };

  return ((found.data ?? []) as PublicProfile[])
    .filter((p) => !blockedIds.has(p.id))
    .map((p) => ({ ...p, status: statusFor(p.id) }));
}

export async function sendFriendRequest(targetId: string): Promise<{ ok?: boolean; error?: string }> {
  const me = await currentUser();
  if (!me) return { error: "Session expired." };
  if (!targetId || targetId === me.id) return { error: "Invalid user." };

  // Don't allow if either side has blocked the other.
  if (isAdminConfigured) {
    const admin = createAdminClient();
    const { data: blocked } = await admin
      .from("blocks")
      .select("id")
      .or(
        `and(blocker_id.eq.${me.id},blocked_id.eq.${targetId}),and(blocker_id.eq.${targetId},blocked_id.eq.${me.id})`,
      )
      .limit(1);
    if (blocked && blocked.length > 0) return { error: "Can't send a request to this user." };
  }

  const supabase = await createClient();
  // If they already have a pending request to me, accept it instead of creating
  // a duplicate row in the other direction.
  const { data: incoming } = await supabase
    .from("friendships")
    .select("id")
    .eq("requester_id", targetId)
    .eq("addressee_id", me.id)
    .eq("status", "pending")
    .maybeSingle();
  if (incoming) {
    await supabase
      .from("friendships")
      .update({ status: "accepted", updated_at: new Date().toISOString() })
      .eq("id", incoming.id)
      .eq("addressee_id", me.id);
    const who = await myIdentity(me.id);
    await notifyUser(targetId, {
      type: "friend_accept",
      title: `${who.name} accepted your friend request`,
      href: who.href,
    });
    revalidatePath("/app/friends");
    return { ok: true };
  }

  const { error } = await supabase
    .from("friendships")
    .insert({ requester_id: me.id, addressee_id: targetId, status: "pending" });
  if (error) {
    // Unique violation → a row already exists; treat as a no-op success.
    if (error.code === "23505") return { ok: true };
    return { error: "Couldn't send the request. Make sure you've run supabase/social.sql." };
  }
  const who = await myIdentity(me.id);
  await notifyUser(targetId, {
    type: "friend_request",
    title: `${who.name} sent you a friend request`,
    href: "/app/friends",
  });
  revalidatePath("/app/friends");
  return { ok: true };
}

export async function respondToRequest(
  friendshipId: string,
  accept: boolean,
): Promise<{ ok?: boolean }> {
  const me = await currentUser();
  if (!me || !friendshipId) return {};
  const supabase = await createClient();
  if (accept) {
    const { data: row } = await supabase
      .from("friendships")
      .select("requester_id")
      .eq("id", friendshipId)
      .eq("addressee_id", me.id)
      .maybeSingle();
    await supabase
      .from("friendships")
      .update({ status: "accepted", updated_at: new Date().toISOString() })
      .eq("id", friendshipId)
      .eq("addressee_id", me.id);
    if (row?.requester_id) {
      const who = await myIdentity(me.id);
      await notifyUser(row.requester_id as string, {
        type: "friend_accept",
        title: `${who.name} accepted your friend request`,
        href: who.href,
      });
    }
  } else {
    await supabase.from("friendships").delete().eq("id", friendshipId).eq("addressee_id", me.id);
  }
  revalidatePath("/app/friends");
  return { ok: true };
}

export async function removeFriend(targetId: string): Promise<{ ok?: boolean }> {
  const me = await currentUser();
  if (!me || !targetId) return {};
  const supabase = await createClient();
  await supabase
    .from("friendships")
    .delete()
    .or(
      `and(requester_id.eq.${me.id},addressee_id.eq.${targetId}),and(requester_id.eq.${targetId},addressee_id.eq.${me.id})`,
    );
  revalidatePath("/app/friends");
  return { ok: true };
}

export async function blockUser(targetId: string): Promise<{ ok?: boolean }> {
  const me = await currentUser();
  if (!me || !targetId || targetId === me.id) return {};
  const supabase = await createClient();
  // Remove any friendship, then record the block.
  await supabase
    .from("friendships")
    .delete()
    .or(
      `and(requester_id.eq.${me.id},addressee_id.eq.${targetId}),and(requester_id.eq.${targetId},addressee_id.eq.${me.id})`,
    );
  await supabase.from("blocks").insert({ blocker_id: me.id, blocked_id: targetId });
  revalidatePath("/app/friends");
  return { ok: true };
}

export async function unblockUser(targetId: string): Promise<{ ok?: boolean }> {
  const me = await currentUser();
  if (!me || !targetId) return {};
  const supabase = await createClient();
  await supabase.from("blocks").delete().eq("blocker_id", me.id).eq("blocked_id", targetId);
  revalidatePath("/app/friends");
  return { ok: true };
}

// --- profile sharing settings ---------------------------------------------
const SECTION_IDS = new Set(SECTIONS.map((s) => s.id));
const VIS = new Set(VISIBILITY_OPTIONS.map((v) => v.id));

export async function updatePrivacy(map: PrivacyMap): Promise<{ ok?: boolean; error?: string }> {
  const me = await currentUser();
  if (!me) return { error: "Session expired." };
  const clean: PrivacyMap = {};
  for (const [k, v] of Object.entries(map ?? {})) {
    if (SECTION_IDS.has(k as SectionId) && VIS.has(v as Visibility)) {
      clean[k as SectionId] = v as Visibility;
    }
  }
  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ privacy: clean }).eq("id", me.id);
  if (error) return { error: "Couldn't save. Make sure you've run supabase/social.sql." };
  revalidatePath("/app/settings");
  return { ok: true };
}

export async function updateBio(bio: string): Promise<{ ok?: boolean; error?: string }> {
  const me = await currentUser();
  if (!me) return { error: "Session expired." };
  const clean = (bio ?? "").trim().slice(0, 280) || null;
  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ bio: clean }).eq("id", me.id);
  if (error) return { error: "Couldn't save your bio." };
  revalidatePath("/app/settings");
  return { ok: true };
}
