export const USERNAME_RE = /^[a-zA-Z0-9_]{2,17}$/;

export function validateUsername(name: string): string | null {
  if (!name) return "Pick a username.";
  if (name.length > 17) return "Usernames can be at most 17 characters.";
  if (!USERNAME_RE.test(name))
    return "Use 2–17 letters, numbers, or underscores.";
  return null;
}
