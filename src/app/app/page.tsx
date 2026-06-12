import type { Metadata } from "next";
import Link from "next/link";
import DashboardCard from "@/components/dashboard/card";
import Icon, { type IconName } from "@/components/icons";
import {
  ActivityChart,
  CategoryChart,
  GamingChart,
} from "@/components/dashboard/charts-lazy";
import MiniCalendar from "@/components/dashboard/mini-calendar";
import { createClient } from "@/lib/supabase/server";
import { currentUser } from "@/lib/auth";
import {
  aggregate,
  statCards,
  type GameRow,
  type SessionRow,
  type WorkoutRow,
} from "@/lib/dashboard";
import { buildSummary } from "@/lib/summary";
import { buildReport } from "@/lib/report";
import ScoreRing, { ringTone } from "@/components/insights/score-ring";
import ProfileSetupCard from "@/components/dashboard/profile-setup-card";
import {
  effectiveTargets,
  suggestTargets,
  type Targets,
} from "@/lib/nutrition";
import { serverToday } from "@/lib/server-today";
import {
  currentValue,
  formatValue,
  progressPct,
  type Goal,
  type GoalLog,
} from "@/lib/goals";
import type { Gender } from "@/lib/onboarding";
import { buildQuests, type QuestKey, type QuestSignal } from "@/lib/quests";
import DailyQuests from "@/components/quests/daily-quests";
import StreakNudge from "@/components/quests/streak-nudge";

export const metadata: Metadata = { title: "Dashboard — Upward" };

function isoDaysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

function OpenLink({ href }: { href: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1 text-xs font-medium text-muted transition-colors hover:text-ember"
    >
      Open <Icon name="external" size={14} />
    </Link>
  );
}

const METRIC_LABEL: Record<string, string> = {
  matches: "matches",
  wins: "wins",
  hours: "hours",
};

export default async function DashboardPage() {
  const user = await currentUser();
  const supabase = await createClient();
  const since = isoDaysAgo(56);
  const today = await serverToday();

  const [wRes, sRes, gRes, pRes, mRes, goalsRes, goalLogsRes, suppRes, suppLogRes, jRes] =
    await Promise.all([
      supabase
        .from("workouts")
        .select("performed_on, category, duration_min")
        .gte("performed_on", since),
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
      supabase
        .from("goals")
        .select("*")
        .eq("status", "active")
        .order("created_at", { ascending: true }),
      supabase.from("goal_logs").select("*"),
      supabase.from("supplements").select("id"),
      supabase.from("supplement_logs").select("supplement_id, taken_on").gte("taken_on", since),
      supabase.from("journal_entries").select("entry_date, mood").gte("entry_date", since),
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

  // Nutrition (today's totals vs effective targets)
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

  // Every kind of logged activity counts toward the streak, not just
  // workouts/gaming — a meal, journal entry, supplement check-off, or goal
  // check-in keeps the day alive.
  const extraActiveDates = [
    ...mealsAll.map((m) => m.eaten_on),
    ...journal.map((j) => j.entry_date),
    ...((suppLogRes.error ? [] : (suppLogRes.data ?? [])) as { taken_on: string }[]).map(
      (l) => l.taken_on,
    ),
    ...((goalLogsRes.error ? [] : (goalLogsRes.data ?? [])) as { logged_on: string }[]).map(
      (l) => l.logged_on,
    ),
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
  const summary = buildSummary(a);
  const cards = statCards(a);

  // General goals (active) with progress.
  const goalsTableMissing = Boolean(goalsRes.error);
  const activeGoals = (goalsRes.error ? [] : (goalsRes.data ?? [])) as Goal[];
  const allGoalLogs = (goalLogsRes.error ? [] : (goalLogsRes.data ?? [])) as GoalLog[];
  const logsByGoal: Record<string, GoalLog[]> = {};
  for (const l of allGoalLogs) (logsByGoal[l.goal_id] ??= []).push(l);
  const goalItems = activeGoals.slice(0, 4).map((g) => {
    const logs = logsByGoal[g.id] ?? [];
    return {
      id: g.id,
      title: g.title,
      pct: progressPct(g, logs),
      label:
        g.type === "binary"
          ? "In progress"
          : `${formatValue(g, currentValue(g, logs))} / ${formatValue(
              g,
              g.target_value ?? 0,
            )}`,
    };
  });

  // Supplements taken today.
  const suppTableMissing = Boolean(suppRes.error);
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
  const suppPct = suppTotal ? Math.round((suppTaken / suppTotal) * 100) : 0;

  // Profile completeness (separate tolerant query — columns span migrations).
  const identityRes = user
    ? await supabase
        .from("profiles")
        .select("username, display_name, avatar_url")
        .eq("id", user.id)
        .maybeSingle()
    : { data: null, error: null };
  const identity = identityRes.error ? null : identityRes.data;
  const setupNeeded =
    identity !== null &&
    (!identity.username || !identity.display_name || !identity.avatar_url);

  // Cross-system report (30-day window) — the glance into the full card.
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

  // Daily quests — derived from today's logs + this week's engagement (no DB).
  const weekStart = isoDaysAgo(6);
  const days7 = (dates: string[]) =>
    new Set(dates.filter((d) => d >= weekStart && d <= today)).size;
  const questSignals: Record<QuestKey, QuestSignal> = {
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
  const questBoard = buildQuests(questSignals);

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <div className="u-rise u-d1">
        <h1 className="u-gradient-text font-display text-[2rem] font-normal tracking-tight">
          Dashboard
        </h1>
        <p className="mt-1 text-sm text-muted">
          A calm overview of where you stand.
        </p>
      </div>

      {setupNeeded && identity && (
        <div className="u-rise u-d2">
          <ProfileSetupCard
            hasUsername={Boolean(identity.username)}
            hasDisplayName={Boolean(identity.display_name)}
            hasAvatar={Boolean(identity.avatar_url)}
          />
        </div>
      )}

      {/* Stat cards */}
      <div className="u-rise u-d2 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {cards.map((s) => (
          <div key={s.label} className="u-glow-border u-hover-glow rounded-2xl border border-line bg-card p-5">
            <div className="flex items-center gap-2 text-faint">
              <Icon name={s.icon as IconName} size={16} />
              <span className="text-xs font-semibold uppercase tracking-[0.12em]">
                {s.label}
              </span>
            </div>
            <p className="mt-3 font-display text-3xl text-ink">{s.value}</p>
            <p className="text-xs text-muted">{s.suffix}</p>
          </div>
        ))}
      </div>

      {/* Streak at-risk nudge — only when a live streak hasn't been kept today */}
      {a.streakDays > 0 && !a.loggedToday && <StreakNudge days={a.streakDays} />}

      {/* Daily quests */}
      <DailyQuests board={questBoard} />

      {/* Main grid */}
      <div className="u-rise u-d3 grid gap-5 lg:grid-cols-3">
        <DashboardCard
          title="Your report card"
          className="lg:col-span-2"
          action={<OpenLink href="/app/insights" />}
        >
          <div className="flex flex-col gap-4">
            {report.overall !== null && (
              <div className="flex items-center gap-4">
                <ScoreRing value={report.overall} tone={ringTone(report.overall)} size={76} />
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold uppercase tracking-[0.12em] text-faint">
                      Overall · 30 days
                    </span>
                    <span className="rounded-full bg-paper px-2 py-0.5 text-xs font-semibold text-ink-soft">
                      {report.grade}
                    </span>
                  </div>
                  <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">
                    {report.headline}
                  </p>
                </div>
              </div>
            )}

            <p className="text-lg leading-relaxed text-ink-soft">
              {summary.map((tok, i) =>
                tok.em ? (
                  <span key={i} className="font-medium text-ember">
                    {tok.t}
                  </span>
                ) : (
                  <span key={i}>{tok.t}</span>
                ),
              )}
            </p>

            {(report.strengths[0] || report.focus[0]) && (
              <div className="grid gap-2.5 sm:grid-cols-2">
                {report.strengths[0] && (
                  <div className="rounded-xl border border-line bg-paper-bright p-3">
                    <p className="text-[0.7rem] font-semibold uppercase tracking-[0.1em] text-ember">
                      Working
                    </p>
                    <p className="mt-1 text-sm leading-relaxed text-ink-soft">
                      {report.strengths[0].text}
                    </p>
                  </div>
                )}
                {report.focus[0] && (
                  <div className="rounded-xl border border-line bg-paper-bright p-3">
                    <p className="text-[0.7rem] font-semibold uppercase tracking-[0.1em] text-danger">
                      Focus
                    </p>
                    <p className="mt-1 text-sm leading-relaxed text-ink-soft">
                      {report.focus[0].text}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </DashboardCard>

        {/* Gaming weekly goals */}
        <DashboardCard title="Gaming goals" action={<OpenLink href="/app/gaming" />}>
          {a.goalProgress.length === 0 ? (
            <div className="flex h-full flex-col justify-center gap-2 py-6 text-center">
              <p className="text-sm text-muted">
                No goals set yet. Add weekly targets in a game to track them here.
              </p>
              <Link
                href="/app/gaming"
                className="text-sm font-medium text-ember transition-colors hover:text-ink"
              >
                Set goals →
              </Link>
            </div>
          ) : (
            <ul className="space-y-3">
              {a.goalProgress.slice(0, 5).map((g, i) => (
                <li key={i}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="text-ink-soft">
                      {g.game}{" "}
                      <span className="text-faint">· {METRIC_LABEL[g.metric]}</span>
                    </span>
                    <span className="text-muted">
                      {g.value}
                      {g.metric === "hours" ? "h" : ""} / {g.target}
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-line">
                    <div
                      className="h-full rounded-full bg-ember transition-[width] duration-500"
                      style={{ width: `${g.pct}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </DashboardCard>

        {/* Goals (general) */}
        {!goalsTableMissing && (
          <DashboardCard title="Goals" action={<OpenLink href="/app/goals" />}>
            {goalItems.length === 0 ? (
              <div className="flex h-full flex-col justify-center gap-2 py-6 text-center">
                <p className="text-sm text-muted">
                  No goals yet. Set one and track the journey here.
                </p>
                <Link
                  href="/app/goals"
                  className="text-sm font-medium text-ember transition-colors hover:text-ink"
                >
                  Set a goal →
                </Link>
              </div>
            ) : (
              <ul className="space-y-3">
                {goalItems.map((g) => (
                  <li key={g.id}>
                    <div className="mb-1 flex justify-between gap-3 text-sm">
                      <span className="truncate text-ink-soft">{g.title}</span>
                      <span className="shrink-0 text-muted">{g.label}</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-line">
                      <div
                        className="h-full rounded-full bg-ember transition-[width] duration-500"
                        style={{ width: `${g.pct}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </DashboardCard>
        )}

        {/* Activity */}
        <DashboardCard title="Activity · minutes" className="lg:col-span-2">
          {a.hasAny ? (
            <ActivityChart data={a.perDayMinutes} />
          ) : (
            <EmptyChart label="Log a session to see your week take shape." />
          )}
        </DashboardCard>

        {/* Calendar */}
        <DashboardCard title="Calendar" action={<OpenLink href="/app/calendar" />}>
          <MiniCalendar activeDays={a.activeDaysThisMonth} />
        </DashboardCard>

        {/* Supplements today */}
        {!suppTableMissing && (
          <DashboardCard
            title="Supplements today"
            action={<OpenLink href="/app/supplement" />}
          >
            {suppTotal === 0 ? (
              <div className="flex h-full flex-col justify-center gap-2 py-6 text-center">
                <p className="text-sm text-muted">
                  Build your daily stack and check it off here.
                </p>
                <Link
                  href="/app/supplement"
                  className="text-sm font-medium text-ember transition-colors hover:text-ink"
                >
                  Add supplements →
                </Link>
              </div>
            ) : (
              <div className="flex h-full flex-col justify-center">
                <p className="font-display text-3xl text-ink">
                  {suppTaken}
                  <span className="text-lg text-muted"> / {suppTotal} taken</span>
                </p>
                <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-line">
                  <div
                    className="h-full rounded-full bg-ember transition-[width] duration-500"
                    style={{ width: `${suppPct}%` }}
                  />
                </div>
              </div>
            )}
          </DashboardCard>
        )}

        {/* Workouts by type (only if any) */}
        {a.hasWorkouts && a.workoutsByCategory.length > 0 && (
          <DashboardCard title="Workouts by type">
            <CategoryChart data={a.workoutsByCategory} />
          </DashboardCard>
        )}

        {/* Gaming matches (only if any) */}
        {a.hasGaming && a.matchesByGame.length > 0 && (
          <DashboardCard title="Matches by game">
            <GamingChart data={a.matchesByGame} />
          </DashboardCard>
        )}
      </div>
    </div>
  );
}

function EmptyChart({ label }: { label: string }) {
  return (
    <div className="flex h-[240px] flex-col items-center justify-center gap-2 text-center">
      <p className="max-w-xs text-sm text-muted">{label}</p>
    </div>
  );
}
