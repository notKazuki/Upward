export const USERNAME_RE = /^[a-zA-Z0-9_]{2,17}$/;
export const USERNAME_COOLDOWN_DAYS = 30;
const DAY_MS = 86_400_000;

export function validateUsername(name: string): string | null {
  if (!name) return "Pick a username.";
  if (name.length > 17) return "Usernames can be at most 17 characters.";
  if (!USERNAME_RE.test(name))
    return "Use 2–17 letters, numbers, or underscores.";
  return null;
}

export const DISPLAY_NAME_MAX = 30;

export function validateDisplayName(name: string): string | null {
  if (!name) return "Display name can't be empty.";
  if (name.length > DISPLAY_NAME_MAX)
    return `Display names can be at most ${DISPLAY_NAME_MAX} characters.`;
  return null;
}

/** Milliseconds until the username can be changed again (0 = allowed now). */
export function usernameCooldownMs(changedAt: string | null): number {
  if (!changedAt) return 0;
  const t = new Date(changedAt).getTime();
  if (!Number.isFinite(t)) return 0;
  return Math.max(0, t + USERNAME_COOLDOWN_DAYS * DAY_MS - Date.now());
}

/** The date the username becomes changeable again, or null if it already is. */
export function usernameUnlockDate(changedAt: string | null): Date | null {
  if (!changedAt) return null;
  const t = new Date(changedAt).getTime();
  if (!Number.isFinite(t) || t + USERNAME_COOLDOWN_DAYS * DAY_MS <= Date.now())
    return null;
  return new Date(t + USERNAME_COOLDOWN_DAYS * DAY_MS);
}
