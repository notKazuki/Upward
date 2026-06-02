import type { Aggregates } from "./dashboard";

export type Token = { t: string; em?: boolean };

/* Seeded RNG so phrasing is stable within a day but varies day to day. */
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function seedFrom(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const t = (s: string): Token => ({ t: s });
const em = (s: string): Token => ({ t: s, em: true });

type Rng = () => number;
function pick<T>(rng: Rng, arr: T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}

type Candidate = { score: number; tokens: Token[] };

/**
 * Turn the user's real aggregated data into a short, specific, human-sounding
 * summary. Pure code (no AI / no cost): many rules, each with phrasing
 * variants, scored and curated down to a few sentences.
 */
export function buildSummary(a: Aggregates): Token[] {
  const rng = mulberry32(seedFrom(a.todayStr));

  // Brand-new user, nothing logged anywhere.
  if (!a.hasAny && !a.nutrition.hasMeals) {
    return pickOpening(rng);
  }

  const c: Candidate[] = [];
  const add = (score: number, tokens: Token[]) =>
    c.push({ score: score + rng() * 6, tokens });

  /* Streak */
  if (a.streakDays >= 2) {
    add(
      92,
      pick(rng, [
        [t("You're on a "), em(`${a.streakDays}-day streak`), t(". ")],
        [em(`${a.streakDays} days`), t(" in a row — the momentum is real. ")],
        [t("That's "), em(`${a.streakDays} straight days`), t(" of showing up. ")],
      ]),
    );
  } else if (a.loggedToday) {
    add(46, pick(rng, [
      [t("You've already shown up today. ")],
      [t("Logged something today — good start. ")],
    ]));
  }

  /* Workout volume delta */
  if (a.hasWorkouts && a.lastWeek.workoutMin > 0) {
    const delta = a.week.workoutMin - a.lastWeek.workoutMin;
    const pct = Math.round((delta / a.lastWeek.workoutMin) * 100);
    if (pct >= 5) {
      const lead = pick(rng, [
        [t("Training volume is "), em(`up ${pct}%`), t(" on last week")],
        [t("You're training "), em(`${pct}% more`), t(" than last week")],
      ]);
      const tail = a.topCategory
        ? [t(", led by "), em(a.topCategory.toLowerCase()), t(". ")]
        : [t(". ")];
      add(74, [...lead, ...tail]);
    } else if (pct <= -5) {
      add(70, pick(rng, [
        [t("Training volume is "), em(`down ${Math.abs(pct)}%`), t(" from last week — an easy place to gain ground. ")],
        [t("A "), em(`${Math.abs(pct)}% lighter`), t(" training week than last — worth a nudge. ")],
      ]));
    } else {
      add(34, [t("Training volume is holding steady with last week. ")]);
    }
  }

  /* Workouts this week + peak day */
  if (a.hasWorkouts && a.week.workoutCount > 0) {
    const base: Token[] = pick(rng, [
      [em(`${a.week.workoutCount} workout${a.week.workoutCount === 1 ? "" : "s"}`), t(" logged this week")],
      [t("You've trained "), em(`${a.week.workoutCount} time${a.week.workoutCount === 1 ? "" : "s"}`), t(" this week")],
    ]);
    const tail =
      a.peakDay.minutes > 0
        ? [t(", with "), em(a.peakDay.day), t(" your biggest day. ")]
        : [t(". ")];
    add(56, [...base, ...tail]);
  }

  /* Inactivity nudge (workouts) */
  if (a.daysSinceWorkout !== null && a.daysSinceWorkout >= 3) {
    add(76, pick(rng, [
      [t("It's been "), em(`${a.daysSinceWorkout} days`), t(" since your last workout. ")],
      [em(`${a.daysSinceWorkout} days`), t(" since you last trained — a short session counts. ")],
    ]));
  }

  /* Neglected split day */
  if (a.neglectedDay) {
    add(66, pick(rng, [
      [t("You haven't trained "), em(a.neglectedDay.day), t(" in "), em(`${a.neglectedDay.days} days`), t(". ")],
      [em(a.neglectedDay.day), t(" is overdue — "), em(`${a.neglectedDay.days} days`), t(" since the last one. ")],
    ]));
  }

  /* Gaming win-rate trend */
  if (a.hasGaming && a.week.winRate !== null && a.lastWeek.winRate !== null) {
    const d = a.week.winRate - a.lastWeek.winRate;
    if (d >= 3) {
      add(73, pick(rng, [
        [t("Your win rate "), em(`climbed ${d} points`), t(" to "), em(`${a.week.winRate}%`), t(". ")],
        [t("Win rate's up to "), em(`${a.week.winRate}%`), t(" — "), em(`+${d}`), t(" on last week. ")],
      ]));
    } else if (d <= -3) {
      add(60, pick(rng, [
        [t("Win rate dipped to "), em(`${a.week.winRate}%`), t(" — variance happens. ")],
        [t("Win rate slid "), em(`${Math.abs(d)} points`), t(" to "), em(`${a.week.winRate}%`), t(" this week. ")],
      ]));
    } else {
      add(36, [t("Win rate's steady around "), em(`${a.week.winRate}%`), t(". ")]);
    }
  } else if (a.hasGaming && a.week.winRate !== null) {
    add(48, [t("You're sitting at a "), em(`${a.week.winRate}%`), t(" win rate this week. ")]);
  }

  /* Gaming volume */
  if (a.hasGaming && a.week.matches > 0) {
    const top = a.matchesByGame[0];
    const tail = top ? [t(" across "), em(top.game), t(". ")] : [t(" this week. ")];
    add(50, [em(`${a.week.matches} matches`), ...tail]);
  }

  /* Gaming goal pace */
  const hitGoal = a.goalProgress.find((g) => g.pct >= 100);
  if (hitGoal) {
    add(86, [t("You hit your weekly "), em(hitGoal.metric), t(" goal in "), em(hitGoal.game), t(" — nice. ")]);
  } else {
    const close = [...a.goalProgress]
      .filter((g) => g.pct > 0 && g.pct < 100)
      .sort((x, y) => y.pct - x.pct)[0];
    if (close) {
      const remaining =
        close.metric === "hours"
          ? `${Math.max(0, Math.round((close.target - close.value) * 10) / 10)}h`
          : `${Math.max(0, close.target - close.value)}`;
      add(80, [
        t("You're "),
        em(`${close.pct}%`),
        t(" to your weekly "),
        em(close.metric),
        t(" goal in "),
        em(close.game),
        t(" — "),
        em(`${remaining} to go`),
        t(". "),
      ]);
    }
  }

  /* Nutrition */
  if (a.nutrition.hasMeals) {
    const { caloriesToday, calTarget, proteinToday, proteinTarget } = a.nutrition;
    if (calTarget) {
      if (caloriesToday > calTarget * 1.08) {
        add(64, [t("You're "), em(`${caloriesToday - calTarget} kcal over`), t(" today's calorie target. ")]);
      } else if (caloriesToday >= calTarget * 0.6) {
        add(60, [t("You're at "), em(`${caloriesToday}`), t(" of "), em(`${calTarget}`), t(" calories today. ")]);
      } else if (caloriesToday > 0) {
        add(52, [em(`${caloriesToday} kcal`), t(" in so far — room to go before "), em(`${calTarget}`), t(". ")]);
      }
    } else if (caloriesToday > 0) {
      add(50, [em(`${caloriesToday} kcal`), t(" logged today. ")]);
    }
    if (proteinTarget && proteinToday > 0) {
      const p = Math.round((proteinToday / proteinTarget) * 100);
      add(54, pick(rng, [
        [t("Protein's at "), em(`${proteinToday}g`), t(" — "), em(`${p}%`), t(" of goal. ")],
        [em(`${proteinToday}g protein`), t(" so far, "), em(`${p}%`), t(" of today's goal. ")],
      ]));
    }
  }

  /* Balance */
  if (a.hasWorkouts && a.hasGaming && a.week.workoutCount > 0 && a.week.matches > 0) {
    add(38, pick(rng, [
      [t("A good balance of training and play this week. ")],
      [t("Body and game both getting attention — balanced week. ")],
    ]));
  }

  /* Quiet week (history exists but nothing this week) */
  if (a.hasAny && a.week.activeMin === 0 && a.streakDays === 0) {
    add(58, pick(rng, [
      [t("Quiet week so far — one small session restarts the momentum. ")],
      [t("Nothing logged this week yet; today's a good day to begin again. ")],
    ]));
  }

  // Curate: take the strongest few, in score order.
  const chosen = c.sort((x, y) => y.score - x.score).slice(0, 4);
  if (chosen.length === 0) return pickOpening(rng);
  return chosen.flatMap((x) => x.tokens);
}

function pickOpening(rng: Rng): Token[] {
  return pick(rng, [
    [t("Your space is ready. Log a workout or a gaming session and this summary will start to know you. ")],
    [t("Welcome in. Track your first session and Upward will begin to surface patterns here. ")],
    [t("Nothing tracked yet — add a workout or a game, and your week starts taking shape. ")],
  ]);
}
