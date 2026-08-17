import Link from "next/link";
import Icon from "@/components/icons";
import { ActivityChart } from "@/components/dashboard/charts-lazy";
import FocusList from "@/components/today/focus-list";
import StreakNudge from "@/components/quests/streak-nudge";
import ScoreRing, { ringTone } from "@/components/insights/score-ring";
import ProfileSetupCard from "@/components/dashboard/profile-setup-card";
import DashboardCard from "@/components/dashboard/card";
import { createClient } from "@/lib/supabase/server";
import { currentUser } from "@/lib/auth";
import { aggregate, type GameRow, type SessionRow, type WorkoutRow } from "@/lib/dashboard";
import { buildReport } from "@/lib/report";
import { effectiveTargets, suggestTargets, type Targets } from "@/lib/nutrition";
import { serverToday } from "@/lib/server-today";
import type { Goal, GoalLog } from "@/lib/goals";
import type { Gender } from "@/lib/onboarding";
import { buildFocus, type FocusKey, type FocusSignal } from "@/lib/focus";

function isoDaysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

/**
 * Everything on Today that needs the full data batch. Rendered inside a
 * Suspense boundary so the page shell and the capture box paint (and are
 * usable) immediately while these queries run.
 */
export default async function TodayFeed() {
  const user = await currentUser();
  const supabase = await createClient();
  const since = isoDaysAgo(56);
  const today = await serverToday();

  const [wRes, sRes, gRes, pRes, mRes, goalsRes, goalLogsRes, suppRes, suppLogRes, jRes, idRes] =
    await Promise.all([
      supabase.from("workouts").select("performed_on, category, duration_min").gte("performed_on", since),
      supabase
        .from("game_sessions")
        .select("game_id, played_on, matches, wins, losses, minutes")
        .gte("played_on", since),
      supabase.from("games").select("id, name, goals"),
      user
        ? supabase
            .from("profiles")
            .select("workout_days, dob, gender, height_cm, weight_kg, nutrition_targets")
            .eq("id", user.id)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      supabase.from("meals").select("eaten_on, calories, protein").gte("eaten_on", since),
      supabase.from("goals").select("*").eq("status", "active").order("created_at", { ascending: true }),
      supabase.from("goal_logs").select("*"),
      supabase.from("supplements").select("id"),
      supabase.from("supplement_logs").select("supplement_id, taken_on").gte("taken_on", since),
      supabase.from("journal_entries").select("entry_date, mood").gte("entry_date", since),
      user
        ? supabase
            .from("profiles")
            .select("username, display_name, avatar_url")
            .eq("id", user.id)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
    ]);

  const workouts = (wRes.error ? [] : (wRes.data ?? [])) as WorkoutRow[];
  const sessions = (sRes.error ? [] : (sRes.data ?? [])) as SessionRow[];
  const games = (gRes.error ? [] : (gRes.data ?? [])) as GameRow[];

  const profile = (pRes.error ? null : pRes.data) as {
    workout_days?: string[] | null;
    dob?: string | null;
    gender?: string | null;
    height_cm?: number | null;
    weight_kg?: number | null;
    nutrition_targets?: Targets | null;
  } | null;
  const workoutDays = profile?.workout_days ?? [];

  const mealsAll = (mRes.error ? [] : (mRes.data ?? [])) as {
    eaten_on: string;
    calories: number;
    protein: number;
  }[];
  const mealsToday = mealsAll.filter((m) => m.eaten_on === today);
  const caloriesToday = mealsToday.reduce((s, m) => s + (m.calories || 0), 0);
  const proteinToday = mealsToday.reduce((s, m) => s + (m.protein || 0), 0);
  const journal = (jRes.error ? [] : (jRes.data ?? [])) as {
    entry_date: string;
    mood: string | null;
  }[];

  const suggested = suggestTargets({
    dob: profile?.dob ?? null,
    gender: (profile?.gender as Gender | null) ?? null,
    height_cm: profile?.height_cm ?? null,
    weight_kg: profile?.weight_kg ?? null,
  });
  const savedRaw = profile?.nutrition_targets ?? null;
  const targets = effectiveTargets(
    savedRaw && Object.keys(savedRaw).length > 0 ? savedRaw : null,
    suggested,
  );

  const suppIds = new Set(
    (suppRes.error ? [] : (suppRes.data ?? [])).map((s: { id: string }) => s.id),
  );
  const suppTotal = suppIds.size;
  const suppLogsAll = (suppLogRes.error ? [] : (suppLogRes.data ?? [])) as {
    supplement_id: string;
    taken_on: string;
  }[];
  const suppTaken = suppLogsAll.filter(
    (l) => l.taken_on === today && suppIds.has(l.supplement_id),
  ).length;

  const activeGoals = (goalsRes.error ? [] : (goalsRes.data ?? [])) as Goal[];
  const allGoalLogs = (goalLogsRes.error ? [] : (goalLogsRes.data ?? [])) as GoalLog[];

  // Every kind of logged activity keeps the day's streak alive.
  const extraActiveDates = [
    ...mealsAll.map((m) => m.eaten_on),
    ...journal.map((j) => j.entry_date),
    ...suppLogsAll.map((l) => l.taken_on),
    ...allGoalLogs.map((l) => l.logged_on),
  ];

  const a = aggregate(
    workouts,
    sessions,
    games,
    workoutDays,
    {
      hasMeals: mealsToday.length > 0,
      caloriesToday,
      proteinToday,
      calTarget: targets.calories,
      proteinTarget: targets.protein,
    },
    today,
    extraActiveDates,
  );

  // Cross-system report (30-day window) — powers the coach's nudge.
  const report = buildReport({
    todayStr: today,
    days: 30,
    workouts,
    sessions,
    meals: mealsAll,
    calTarget: targets.calories,
    proteinTarget: targets.protein,
    journal,
    supplementsCount: suppTotal,
    supplementLogs: suppLogsAll,
    goals: activeGoals,
    goalLogs: allGoalLogs,
  });

  // Today's focus — derived from today's logs + this week's engagement.
  const weekStart = isoDaysAgo(6);
  const days7 = (dates: string[]) =>
    new Set(dates.filter((d) => d >= weekStart && d <= today)).size;
  const focusSignals: Record<FocusKey, FocusSignal> = {
    workout: {
      active: true,
      done: workouts.some((w) => w.performed_on === today),
      engagement: days7(workouts.map((w) => w.performed_on)),
    },
    meal: {
      active: true,
      done: mealsToday.length > 0,
      engagement: days7(mealsAll.map((m) => m.eaten_on)),
    },
    protein: {
      active: Boolean(targets.protein),
      done: Boolean(targets.protein) && proteinToday >= (targets.protein ?? 0) * 0.9,
      engagement: 0,
    },
    supps: {
      active: suppTotal > 0,
      done: suppTotal > 0 && suppTaken >= suppTotal,
      engagement: days7(suppLogsAll.map((l) => l.taken_on)),
    },
    gaming: {
      active: games.length > 0,
      done: sessions.some((s) => s.played_on === today),
      engagement: days7(sessions.map((s) => s.played_on)),
    },
    journal: {
      active: true,
      done: journal.some((j) => j.entry_date === today),
      engagement: days7(journal.map((j) => j.entry_date)),
    },
    goals: {
      active: activeGoals.length > 0,
      done: allGoalLogs.some((l) => l.logged_on === today),
      engagement: days7(allGoalLogs.map((l) => l.logged_on)),
    },
  };
  const focus = buildFocus(focusSignals);

  const identity = idRes.error ? null : idRes.data;
  const setupNeeded =
    identity !== null &&
    (!identity.username || !identity.display_name || !identity.avatar_url);

  return (
    <div className="space-y-5">
      {setupNeeded && identity && (
        <ProfileSetupCard
          hasUsername={Boolean(identity.username)}
          hasDisplayName={Boolean(identity.display_name)}
          hasAvatar={Boolean(identity.avatar_url)}
        />
      )}

      {/* Coach's nudge */}
      <Link
        href="/app/coach"
        className="group block rounded-2xl border border-line bg-card p-5 transition-colors hover:border-ember/50"
      >
        <div className="flex items-start gap-4">
          {report.overall !== null ? (
            <ScoreRing value={report.overall} tone={ringTone(report.overall)} size={64} />
          ) : (
            <span className="grid size-11 shrink-0 place-items-center rounded-full bg-ember/10 text-ember">
              <Icon name="sparkle" size={20} />
            </span>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-[0.12em] text-ember">
                Your coach
              </span>
              {a.streakDays > 0 && (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-muted">
                  <Icon name="flame" size={12} className="text-ember" />
                  {a.streakDays}-day streak
                </span>
              )}
            </div>
            <p className="mt-1 text-[0.95rem] leading-relaxed text-ink-soft">
              {report.overall !== null
                ? report.headline
                : "Log your day and I'll start reading the patterns — training, food, mind and play, all together."}
            </p>
            <span className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-ember">
              Talk to your coach
              <Icon name="external" size={14} className="transition-transform group-hover:translate-x-0.5" />
            </span>
          </div>
        </div>
      </Link>

      {/* Streak at-risk nudge */}
      {a.streakDays > 0 && !a.loggedToday && <StreakNudge days={a.streakDays} />}

      {/* Today's focus */}
      <FocusList board={focus} />

      {/* This week at a glance */}
      <DashboardCard
        title="This week"
        action={
          <Link
            href="/app/insights"
            className="inline-flex items-center gap-1 text-xs font-medium text-muted transition-colors hover:text-ember"
          >
            Full report <Icon name="external" size={14} />
          </Link>
        }
      >
        {a.hasAny ? (
          <ActivityChart data={a.perDayMinutes} />
        ) : (
          <div className="flex h-[200px] flex-col items-center justify-center gap-2 text-center">
            <p className="max-w-xs text-sm text-muted">
              Log a session and your week starts to take shape here.
            </p>
          </div>
        )}
      </DashboardCard>
    </div>
  );
}

/** Matches TodayFeed's shape so nothing shifts when the real content lands. */
export function TodayFeedSkeleton() {
  return (
    <div className="space-y-5" aria-hidden>
      <div className="h-[124px] animate-pulse rounded-2xl border border-line bg-card" />
      <div className="h-[188px] animate-pulse rounded-2xl border border-line bg-card" />
      <div className="h-[292px] animate-pulse rounded-2xl border border-line bg-card" />
    </div>
  );
}
