// Scheduled reminders — hit every ~15 minutes by a GitHub Actions cron with
// ?key=CRON_SECRET. Sends timezone-aware pushes (+ bell notifications) to
// users who enabled push: supplement reminders at their timing windows, a
// streak-at-risk nudge at 9pm, and a Sunday-evening weekly digest. The
// cron_sends table dedupes, so overlapping runs can't double-send.

import { createAdminClient, isAdminConfigured } from "@/lib/supabase/admin";
import { sendPushToUser, isPushConfigured } from "@/lib/push";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Local hour each supplement timing fires at.
const TIMING_HOURS: Record<string, number> = {
  morning: 8,
  anytime: 12,
  preworkout: 16,
  postworkout: 18,
  evening: 20,
};
const BRIEF_HOUR = 9; // the daily brief from your coach
const STREAK_HOUR = 21;
const DIGEST_HOUR = 18; // Sundays

type Admin = ReturnType<typeof createAdminClient>;

function localParts(tz: string): { date: string; hour: number; dow: number } {
  try {
    const now = new Date();
    const date = new Intl.DateTimeFormat("en-CA", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(now);
    const hour = Number(
      new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "2-digit", hour12: false }).format(now),
    );
    const dow = new Date(`${date}T00:00:00`).getDay();
    return { date, hour: Number.isFinite(hour) ? hour : -1, dow };
  } catch {
    return { date: "", hour: -1, dow: -1 };
  }
}

function shiftYmd(ymd: string, days: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(y, m - 1, d + days);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
}

/** True once per (user, kind, day) — uses cron_sends as a lock. */
async function claim(admin: Admin, userId: string, kind: string, day: string): Promise<boolean> {
  const { data } = await admin
    .from("cron_sends")
    .upsert(
      { user_id: userId, kind, sent_on: day },
      { onConflict: "user_id,kind,sent_on", ignoreDuplicates: true },
    )
    .select();
  return (data ?? []).length > 0;
}

/** Every active day (any tracked action) per user, since `since`. */
async function activityByUser(
  admin: Admin,
  ids: string[],
  since: string,
): Promise<Map<string, Set<string>>> {
  const [w, g, m, j, sl, gl] = await Promise.all([
    admin.from("workouts").select("user_id, performed_on").in("user_id", ids).gte("performed_on", since),
    admin.from("game_sessions").select("user_id, played_on").in("user_id", ids).gte("played_on", since),
    admin.from("meals").select("user_id, eaten_on").in("user_id", ids).gte("eaten_on", since),
    admin.from("journal_entries").select("user_id, entry_date").in("user_id", ids).gte("entry_date", since),
    admin.from("supplement_logs").select("user_id, taken_on").in("user_id", ids).gte("taken_on", since),
    admin.from("goal_logs").select("user_id, logged_on").in("user_id", ids).gte("logged_on", since),
  ]);

  const activity = new Map<string, Set<string>>();
  const add = (rows: unknown, key: string) => {
    for (const r of (rows ?? []) as Record<string, string>[]) {
      const uid = r.user_id;
      const date = r[key];
      if (!uid || !date) continue;
      const set = activity.get(uid) ?? new Set<string>();
      set.add(date);
      activity.set(uid, set);
    }
  };
  add(w.data, "performed_on");
  add(g.data, "played_on");
  add(m.data, "eaten_on");
  add(j.data, "entry_date");
  add(sl.data, "taken_on");
  add(gl.data, "logged_on");
  return activity;
}

async function bell(admin: Admin, userId: string, title: string, body: string, href: string) {
  try {
    await admin
      .from("notifications")
      .insert({ user_id: userId, type: "announcement", title, body, href });
  } catch {
    /* best-effort */
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const key = url.searchParams.get("key") ?? request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const secret = process.env.CRON_SECRET;
  if (!secret || key !== secret) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!isAdminConfigured || !isPushConfigured) {
    return Response.json({ error: "push not configured" }, { status: 503 });
  }

  const admin = createAdminClient();

  // Only users with at least one push device get scheduled reminders.
  const { data: subRows } = await admin.from("push_subscriptions").select("user_id");
  const userIds = [...new Set(((subRows ?? []) as { user_id: string }[]).map((r) => r.user_id))];
  if (userIds.length === 0) return Response.json({ checked: 0, sent: 0 });

  const { data: profRows } = await admin
    .from("profiles")
    .select("id, timezone")
    .in("id", userIds);
  const users = ((profRows ?? []) as { id: string; timezone: string | null }[]).map((u) => ({
    id: u.id,
    ...localParts(u.timezone || "UTC"),
  }));

  let sent = 0;

  // ---- Supplement reminders -------------------------------------------
  const timingsDue = new Map<string, string[]>(); // userId -> timings due now
  for (const u of users) {
    const due = Object.entries(TIMING_HOURS)
      .filter(([, h]) => h === u.hour)
      .map(([t]) => t);
    if (due.length > 0) timingsDue.set(u.id, due);
  }
  if (timingsDue.size > 0) {
    const dueIds = [...timingsDue.keys()];
    const dates = [...new Set(users.filter((u) => timingsDue.has(u.id)).map((u) => u.date))];
    const [suppRes, logRes] = await Promise.all([
      admin.from("supplements").select("id, user_id, name, timing").in("user_id", dueIds),
      admin
        .from("supplement_logs")
        .select("user_id, supplement_id, taken_on")
        .in("user_id", dueIds)
        .in("taken_on", dates),
    ]);
    const suppFull = suppRes.data;
    const taken = new Set(
      ((logRes.data ?? []) as { user_id: string; supplement_id: string; taken_on: string }[]).map(
        (l) => `${l.user_id}|${l.supplement_id}|${l.taken_on}`,
      ),
    );
    for (const u of users) {
      const due = timingsDue.get(u.id);
      if (!due || !u.date) continue;
      for (const timing of due) {
        const missing = ((suppFull ?? []) as { id: string; user_id: string; name: string; timing: string }[]).filter(
          (s) => s.user_id === u.id && s.timing === timing && !taken.has(`${u.id}|${s.id}|${u.date}`),
        );
        if (missing.length === 0) continue;
        if (!(await claim(admin, u.id, `supp-${timing}`, u.date))) continue;
        const names = missing.map((s) => s.name).slice(0, 4).join(", ");
        const title = "Supplement reminder";
        const body = missing.length > 4 ? `${names} +${missing.length - 4} more` : names;
        await sendPushToUser(u.id, { title, body, href: "/app/supplement", tag: `supp-${timing}` });
        await bell(admin, u.id, title, body, "/app/supplement");
        sent++;
      }
    }
  }

  // ---- Daily brief (every morning) --------------------------------------
  // The one reminder that always arrives: without it, a user with no
  // supplements and no live streak would never hear from the app at all.
  const briefUsers = users.filter((u) => u.hour === BRIEF_HOUR && u.date);
  if (briefUsers.length > 0) {
    const ids = briefUsers.map((u) => u.id);
    const since = shiftYmd(briefUsers[0].date, -60);
    const activity = await activityByUser(admin, ids, since);

    for (const u of briefUsers) {
      const days = activity.get(u.id) ?? new Set<string>();
      // Streak ending yesterday (today has barely started).
      let streak = 0;
      let cursor = shiftYmd(u.date, -1);
      while (days.has(cursor)) {
        streak++;
        cursor = shiftYmd(cursor, -1);
      }
      if (!(await claim(admin, u.id, "brief", u.date))) continue;

      const title = "Your day, in one look";
      const body =
        streak >= 2
          ? `You're on a ${streak}-day streak — one log keeps it alive.`
          : streak === 1
            ? "You logged yesterday. Keep it rolling today."
            : "A fresh start — log one thing and your coach picks it up from there.";
      await sendPushToUser(u.id, { title, body, href: "/app", tag: "brief" });
      await bell(admin, u.id, title, body, "/app");
      sent++;
    }
  }

  // ---- Streak at risk ---------------------------------------------------
  const streakUsers = users.filter((u) => u.hour === STREAK_HOUR && u.date);
  if (streakUsers.length > 0) {
    const ids = streakUsers.map((u) => u.id);
    const since = shiftYmd(streakUsers[0].date, -60);
    const activity = await activityByUser(admin, ids, since);

    for (const u of streakUsers) {
      const days = activity.get(u.id) ?? new Set<string>();
      if (days.has(u.date)) continue; // already active today — streak safe
      // Streak ending yesterday.
      let streak = 0;
      let cursor = shiftYmd(u.date, -1);
      while (days.has(cursor)) {
        streak++;
        cursor = shiftYmd(cursor, -1);
      }
      if (streak < 2) continue; // nothing meaningful to lose
      if (!(await claim(admin, u.id, "streak", u.date))) continue;
      const title = `Your ${streak}-day streak ends at midnight`;
      const body = "Log anything — a meal, a journal line, a supplement — to keep it alive.";
      await sendPushToUser(u.id, { title, body, href: "/app", tag: "streak" });
      await bell(admin, u.id, title, body, "/app");
      sent++;
    }
  }

  // ---- Weekly digest (Sunday evening) ------------------------------------
  const digestUsers = users.filter((u) => u.dow === 0 && u.hour === DIGEST_HOUR && u.date);
  for (const u of digestUsers) {
    const weekStart = shiftYmd(u.date, -6);
    const [w, g] = await Promise.all([
      admin.from("workouts").select("performed_on").eq("user_id", u.id).gte("performed_on", weekStart),
      admin.from("game_sessions").select("played_on, matches").eq("user_id", u.id).gte("played_on", weekStart),
    ]);
    const workouts = (w.data ?? []).length;
    const matches = ((g.data ?? []) as { matches: number }[]).reduce((a, r) => a + (r.matches || 0), 0);
    if (!(await claim(admin, u.id, "digest", u.date))) continue;
    const title = "Your week, summarised";
    const body = `${workouts} workout${workouts === 1 ? "" : "s"} · ${matches} match${matches === 1 ? "" : "es"} — open your report card.`;
    await sendPushToUser(u.id, { title, body, href: "/app/insights", tag: "digest" });
    await bell(admin, u.id, title, body, "/app/insights");
    sent++;
  }

  return Response.json({ checked: users.length, sent });
}
