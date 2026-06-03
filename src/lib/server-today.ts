import { cookies } from "next/headers";
import { ymdInTz, weekStartOf } from "./today";

// The browser writes its IANA timezone to a `tz` cookie (see TimezoneCookie).
// Server components read it here so "today"/"this week" match the user's
// calendar, not Vercel's UTC clock. Falls back to UTC until the cookie is set
// (first render of a brand-new visitor), after which it's correct.
async function userTz(): Promise<string> {
  const tz = (await cookies()).get("tz")?.value;
  return tz ? decodeURIComponent(tz) : "UTC";
}

export async function serverToday(): Promise<string> {
  return ymdInTz(await userTz());
}

export async function serverWeekStart(): Promise<string> {
  return weekStartOf(await serverToday());
}
