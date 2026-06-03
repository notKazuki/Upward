import type { Metadata } from "next";
import DashboardCard from "@/components/dashboard/card";
import CalendarBoard from "@/components/calendar/calendar-board";
import { createClient } from "@/lib/supabase/server";
import {
  monthRange,
  type CalendarEvent,
  type MonthActivity,
} from "@/lib/calendar";
import { serverToday } from "@/lib/server-today";

export const metadata: Metadata = { title: "Calendar — Upward" };

type Row = Record<string, unknown>;
function dayNumbers(
  res: { data: Row[] | null; error: unknown },
  key: string,
): number[] {
  if (res.error || !res.data) return [];
  return [
    ...new Set(
      res.data.map((r) => Number(String(r[key]).slice(8, 10))).filter(Boolean),
    ),
  ];
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const sp = await searchParams;
  const monthStr =
    sp.month && /^\d{4}-\d{2}$/.test(sp.month)
      ? sp.month
      : (await serverToday()).slice(0, 7);
  const { start, end } = monthRange(monthStr);

  const supabase = await createClient();
  const [evRes, wRes, mRes, gRes] = await Promise.all([
    supabase
      .from("calendar_events")
      .select("*")
      .gte("date", start)
      .lte("date", end),
    supabase
      .from("workouts")
      .select("performed_on")
      .gte("performed_on", start)
      .lte("performed_on", end),
    supabase
      .from("meals")
      .select("eaten_on")
      .gte("eaten_on", start)
      .lte("eaten_on", end),
    supabase
      .from("game_sessions")
      .select("played_on")
      .gte("played_on", start)
      .lte("played_on", end),
  ]);

  const tableMissing = Boolean(evRes.error);
  const events = (evRes.data ?? []) as CalendarEvent[];
  const activity: MonthActivity = {
    workouts: dayNumbers(wRes, "performed_on"),
    meals: dayNumbers(mRes, "eaten_on"),
    gaming: dayNumbers(gRes, "played_on"),
  };

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <div>
        <h1 className="font-display text-[2rem] font-normal tracking-tight text-ink">
          Calendar
        </h1>
        <p className="mt-1 text-sm text-muted">
          Plan your days — and see everything you&rsquo;ve tracked in one place.
        </p>
      </div>

      {tableMissing ? (
        <DashboardCard title="One step left">
          <p className="text-sm leading-relaxed text-muted">
            Run <code className="text-ink">supabase/calendar.sql</code> in
            Supabase → <b>SQL Editor</b>, then refresh this page.
          </p>
        </DashboardCard>
      ) : (
        <CalendarBoard monthStr={monthStr} events={events} activity={activity} />
      )}
    </div>
  );
}
