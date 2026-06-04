// Social foundation — shared types + the per-section privacy model.
// Journal is intentionally absent: it is never shareable.

export type Visibility = "private" | "friends" | "public";

export type SectionId =
  | "stats"
  | "rank"
  | "achievements"
  | "workouts"
  | "nutrition"
  | "gaming"
  | "goals";

export type PrivacyMap = Partial<Record<SectionId, Visibility>>;

/** Order + copy for the privacy settings UI and the profile sections. */
export const SECTIONS: { id: SectionId; label: string; hint: string }[] = [
  { id: "stats", label: "Activity overview", hint: "Streak, active days, this-week totals" },
  { id: "rank", label: "Level & rank", hint: "Your XP level and rank tier" },
  { id: "achievements", label: "Achievements", hint: "Badges you've earned" },
  { id: "workouts", label: "Workouts", hint: "Training frequency and volume" },
  { id: "nutrition", label: "Nutrition", hint: "Calorie & protein consistency" },
  { id: "gaming", label: "Gaming", hint: "Games, matches and win rate" },
  { id: "goals", label: "Goals", hint: "Active goals and progress" },
];

export const VISIBILITY_OPTIONS: { id: Visibility; label: string }[] = [
  { id: "private", label: "Only me" },
  { id: "friends", label: "Friends" },
  { id: "public", label: "Anyone" },
];

/** Everything starts private. */
export function visibilityOf(privacy: PrivacyMap, section: SectionId): Visibility {
  return privacy?.[section] ?? "private";
}

export type Relationship = "self" | "friend" | "stranger";

/** Can the viewer (given their relationship) see this section? */
export function canView(
  privacy: PrivacyMap,
  section: SectionId,
  rel: Relationship,
): boolean {
  if (rel === "self") return true;
  const v = visibilityOf(privacy, section);
  if (v === "public") return true;
  if (v === "friends") return rel === "friend";
  return false;
}

// --- friendship/relationship shapes (rows the client manages) --------------
export type FriendStatus = "pending" | "accepted";

export type Friendship = {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: FriendStatus;
  created_at: string;
  updated_at: string;
};

/** A lightweight public identity card for lists, search, and headers. */
export type PublicProfile = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
};

export function profileName(p: PublicProfile): string {
  return p.display_name || p.username || "Upward member";
}

export function initialsOf(p: PublicProfile): string {
  const base = p.display_name || p.username || "U";
  const parts = base.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "U";
}
