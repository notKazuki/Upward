// Date helpers that respect the *user's* calendar day, not the server's.
//
// The gotcha these solve: `new Date().toISOString()` is always UTC, and Vercel
// runs in UTC. So after ~7-8pm US-Eastern the server (and toISOString on the
// client) already think it's "tomorrow". These helpers keep "today" anchored to
// the user's local/zone calendar date.

/** Local calendar date as YYYY-MM-DD (correct on the client — it's their zone). */
export function ymdLocal(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

/** "Now" as YYYY-MM-DD in a specific IANA timezone (works on the server). */
export function ymdInTz(tz: string, d: Date = new Date()): string {
  try {
    // en-CA formats as YYYY-MM-DD.
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(d);
  } catch {
    return ymdLocal(d);
  }
}

/** `n` consecutive YYYY-MM-DD dates ending at (and including) `endYmd`. */
export function daysEnding(endYmd: string, n: number): string[] {
  const [y, m, d] = endYmd.split("-").map(Number);
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    out.push(ymdLocal(new Date(y, m - 1, d - i)));
  }
  return out;
}

/** Monday-based start of the week containing `ymd`, as YYYY-MM-DD. */
export function weekStartOf(ymd: string): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const offset = (date.getDay() + 6) % 7; // 0 = Monday
  date.setDate(date.getDate() - offset);
  return ymdLocal(date);
}
