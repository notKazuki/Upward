// Cross-system "report card" — pure, deterministic scoring over a period.
// Turns every tracker's data into per-domain scores (0-100), an overall grade,
// and specific "what's working" / "where to focus" points. No AI, no cost.

import { progressPct, deadlineState, type Goal, type GoalLog } from "./goals";

export type Tone = "good" | "okay" | "bad";

export type DomainScore = {
  id: string;
  label: string;
  icon: string;
  score: number; // 0-100
  tone: Tone;
  summary: string;
  facts: string[];
};

export type ReportPoint = { domain: string; text: string };

export type Report = {
  overall: number | null;
  grade: string;
  headline: string;
  domains: DomainScore[];
  strengths: ReportPoint[];
  focus: ReportPoint[];
};

export type ReportInput = {
  todayStr: string;
  days: number;
  workouts: { performed_on: string; category: string; duration_min: number | null }[];
  sessions: { played_on: string; matches: number; wins: number; losses: number; minutes: number }[];
  meals: { eaten_on: string; calories: number; protein: number }[];
  calTarget?: number;
  proteinTarget?: number;
  journal: { entry_date: string; mood: string | null }[];
  supplementsCount: number;
  supplementLogs: { taken_on: string; supplement_id: string }[];
  goals: Goal[];
  goalLogs: GoalLog[];
};

// --- helpers ---------------------------------------------------------------
const clamp = (n: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, Math.round(n)));
const toneFor = (s: number): Tone => (s >= 72 ? "good" : s >= 50 ? "okay" : "bad");
const pct = (n: number) => Math.round(n * 100);

function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function parse(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}
function daysBetween(a: string, b: string): number {
  return Math.round((parse(b).getTime() - parse(a).getTime()) / 86_400_000);
}
function windowStart(todayStr: string, days: number): string {
  const d = parse(todayStr);
  d.setDate(d.getDate() - (days - 1));
  return ymd(d);
}

const MOOD_SCORE: Record<string, number> = { great: 5, good: 4, okay: 3, low: 2, rough: 1 };
const MOOD_LABEL = ["", "Rough", "Low", "Okay", "Good", "Great"];

type Built = { domain: DomainScore; good: string[]; bad: string[] };

// --- domain builders -------------------------------------------------------
function training(inp: ReportInput, start: string): Built | null {
  const w = inp.workouts.filter((x) => x.performed_on >= start && x.performed_on <= inp.todayStr);
  if (w.length === 0) return null;

  const weeks = Math.max(1, inp.days / 7);
  const perWeek = w.length / weeks;
  const dates = w.map((x) => x.performed_on).sort();
  const last = dates[dates.length - 1];
  const sinceLast = daysBetween(last, inp.todayStr);

  let score = clamp((perWeek / 4) * 100);
  if (sinceLast >= 4) score = clamp(score - Math.min(25, (sinceLast - 3) * 6));

  const minutes = w.reduce((a, x) => a + (x.duration_min || 0), 0);
  const cat = new Map<string, number>();
  for (const x of w) cat.set(x.category, (cat.get(x.category) ?? 0) + 1);
  const top = [...cat.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];

  const facts = [
    `${w.length} session${w.length === 1 ? "" : "s"} over ${inp.days} days (~${perWeek.toFixed(1)}/week)`,
    minutes > 0 ? `${Math.round(minutes / 60)}h logged${top ? ` · most: ${top}` : ""}` : "No durations logged",
    sinceLast === 0 ? "Trained today" : `Last session ${sinceLast} day${sinceLast === 1 ? "" : "s"} ago`,
  ];

  const good: string[] = [];
  const bad: string[] = [];
  if (perWeek >= 3.5) good.push(`Training is consistent — about ${perWeek.toFixed(1)} sessions a week.`);
  if (perWeek < 2.5) bad.push(`Only ~${perWeek.toFixed(1)} workouts a week — aim for 3-4 to build momentum.`);
  if (sinceLast >= 5) bad.push(`It's been ${sinceLast} days since your last workout.`);

  return {
    domain: {
      id: "training",
      label: "Training",
      icon: "workout",
      score,
      tone: toneFor(score),
      summary:
        perWeek >= 3.5
          ? "Strong, regular training rhythm."
          : perWeek >= 2
            ? "Training is happening, but inconsistent."
            : "Training has gone quiet.",
      facts,
    },
    good,
    bad,
  };
}

function nutrition(inp: ReportInput, start: string): Built | null {
  const m = inp.meals.filter((x) => x.eaten_on >= start && x.eaten_on <= inp.todayStr);
  if (m.length === 0) return null;

  const byDay = new Map<string, { cal: number; protein: number }>();
  for (const x of m) {
    const cur = byDay.get(x.eaten_on) ?? { cal: 0, protein: 0 };
    cur.cal += x.calories || 0;
    cur.protein += x.protein || 0;
    byDay.set(x.eaten_on, cur);
  }
  const loggedDays = byDay.size;
  const loggingRate = loggedDays / inp.days;

  let proteinHit = 0;
  let calOnTarget = 0;
  for (const v of byDay.values()) {
    if (inp.proteinTarget && v.protein >= inp.proteinTarget * 0.9) proteinHit++;
    if (inp.calTarget && Math.abs(v.cal - inp.calTarget) <= inp.calTarget * 0.15) calOnTarget++;
  }
  const proteinRate = inp.proteinTarget ? proteinHit / loggedDays : null;
  const calRate = inp.calTarget ? calOnTarget / loggedDays : null;

  // Logging consistency is the backbone; adherence refines it.
  let score = loggingRate * 55;
  if (proteinRate !== null) score += proteinRate * 25;
  else score += 12;
  if (calRate !== null) score += calRate * 20;
  else score += 10;
  score = clamp(score);

  const avgCal = Math.round([...byDay.values()].reduce((a, b) => a + b.cal, 0) / loggedDays);
  const facts = [
    `Logged meals on ${loggedDays} of ${inp.days} days (${pct(loggingRate)}%)`,
    inp.calTarget ? `Avg ${avgCal.toLocaleString()} kcal vs ${inp.calTarget.toLocaleString()} target` : `Avg ${avgCal.toLocaleString()} kcal/logged day`,
    proteinRate !== null ? `Protein target hit on ${pct(proteinRate)}% of logged days` : "Set a protein target to track this",
  ];

  const good: string[] = [];
  const bad: string[] = [];
  if (loggingRate >= 0.6) good.push(`You logged meals on ${pct(loggingRate)}% of days — great consistency.`);
  if (proteinRate !== null && proteinRate >= 0.6) good.push(`Protein on point — target met ${pct(proteinRate)}% of logged days.`);
  if (loggingRate < 0.4) bad.push(`Meals logged only ${pct(loggingRate)}% of days — tracking more reveals the picture.`);
  if (proteinRate !== null && proteinRate < 0.4) bad.push(`Protein fell short most days — a focus worth nudging up.`);

  return {
    domain: {
      id: "nutrition",
      label: "Nutrition",
      icon: "meal",
      score,
      tone: toneFor(score),
      summary:
        loggingRate >= 0.6 ? "Consistent tracking, solid adherence." : loggingRate >= 0.3 ? "Tracking some days — room to be steadier." : "Sparse logging this period.",
      facts,
    },
    good,
    bad,
  };
}

function gaming(inp: ReportInput, start: string): Built | null {
  const s = inp.sessions.filter((x) => x.played_on >= start && x.played_on <= inp.todayStr);
  if (s.length === 0) return null;

  const wins = s.reduce((a, x) => a + x.wins, 0);
  const losses = s.reduce((a, x) => a + x.losses, 0);
  const matches = s.reduce((a, x) => a + x.matches, 0);
  const decided = wins + losses;
  const winRate = decided > 0 ? Math.round((wins / decided) * 100) : null;
  const hours = Math.round(s.reduce((a, x) => a + (x.minutes || 0), 0) / 60);

  // Gentle scoring: 50% win rate is "average" → a neutral-good baseline.
  let score = 60;
  if (winRate !== null && decided >= 10) score = clamp(winRate + 8, 25, 100);

  const facts = [
    `${matches} match${matches === 1 ? "" : "es"} across ${inp.days} days`,
    winRate !== null ? `${winRate}% win rate (${wins}W / ${losses}L)` : "Not enough decided games for a win rate",
    `${hours}h played`,
  ];

  const good: string[] = [];
  const bad: string[] = [];
  if (winRate !== null && winRate >= 55 && decided >= 10) good.push(`Winning more than you lose — ${winRate}% across ${decided} games.`);
  if (winRate !== null && winRate < 43 && decided >= 15) bad.push(`Win rate is ${winRate}% lately — variance, or time for a reset.`);

  return {
    domain: {
      id: "gaming",
      label: "Gaming",
      icon: "gaming",
      score,
      tone: toneFor(score),
      summary:
        winRate === null ? "Logged play, win rate still forming." : winRate >= 55 ? "Climbing — win rate looks healthy." : winRate >= 45 ? "Holding steady around even." : "A rough patch on the ladder.",
      facts,
    },
    good,
    bad,
  };
}

function mind(inp: ReportInput, start: string): Built | null {
  const j = inp.journal.filter((x) => x.entry_date >= start && x.entry_date <= inp.todayStr);
  if (j.length === 0) return null;

  const weeks = Math.max(1, inp.days / 7);
  const perWeek = j.length / weeks;
  let score = clamp((perWeek / 4) * 100);

  const moods = j.map((x) => MOOD_SCORE[x.mood ?? ""]).filter((n) => typeof n === "number");
  const avgMood = moods.length ? moods.reduce((a, b) => a + b, 0) / moods.length : null;
  if (avgMood !== null) score = clamp(score * 0.8 + ((avgMood - 1) / 4) * 20 + 0); // nudge by mood

  const facts = [
    `${j.length} entr${j.length === 1 ? "y" : "ies"} over ${inp.days} days (~${perWeek.toFixed(1)}/week)`,
    avgMood !== null ? `Average mood: ${MOOD_LABEL[Math.round(avgMood)]}` : "Add a mood to entries to track how you feel",
  ];

  const good: string[] = [];
  const bad: string[] = [];
  if (perWeek >= 3) good.push(`Journaling regularly — ~${perWeek.toFixed(1)} entries a week.`);
  if (avgMood !== null && avgMood >= 4) good.push(`Mood has been good lately (avg ${MOOD_LABEL[Math.round(avgMood)]}).`);
  if (perWeek < 1) bad.push(`Only ${j.length} journal entr${j.length === 1 ? "y" : "ies"} this period — a line a day adds up.`);
  if (avgMood !== null && avgMood <= 2.2) bad.push(`Mood has skewed low — worth being gentle with yourself.`);

  return {
    domain: {
      id: "mind",
      label: "Mind",
      icon: "journal",
      score,
      tone: toneFor(score),
      summary: perWeek >= 3 ? "Reflecting often." : perWeek >= 1 ? "Checking in now and then." : "Quiet on the journal.",
      facts,
    },
    good,
    bad,
  };
}

function supplements(inp: ReportInput, start: string): Built | null {
  if (inp.supplementsCount === 0) return null;
  const logs = inp.supplementLogs.filter((x) => x.taken_on >= start && x.taken_on <= inp.todayStr);

  // Adherence from the first day they logged (so a newly-added stack isn't
  // penalised for days before it existed): taken doses / (stack size × window).
  const firstLog = logs.length ? logs.map((x) => x.taken_on).sort()[0] : inp.todayStr;
  const windowDays = Math.max(1, daysBetween(firstLog, inp.todayStr) + 1);
  const possible = inp.supplementsCount * windowDays;
  const adherence = logs.length === 0 ? 0 : Math.min(1, logs.length / possible);
  const score = clamp(adherence * 100);

  const takenDays = new Set(logs.map((x) => x.taken_on)).size;
  const facts = [
    `${inp.supplementsCount} in your stack`,
    `~${pct(adherence)}% of doses taken over ${inp.days} days`,
    `Logged something on ${takenDays} of ${inp.days} days`,
  ];

  const good: string[] = [];
  const bad: string[] = [];
  if (adherence >= 0.8) good.push(`Supplement routine is dialed in — ~${pct(adherence)}% adherence.`);
  if (adherence < 0.5) bad.push(`Supplements taken ~${pct(adherence)}% of the time — easy consistency win.`);

  return {
    domain: {
      id: "supplements",
      label: "Supplements",
      icon: "supplement",
      score,
      tone: toneFor(score),
      summary: adherence >= 0.8 ? "Rarely miss a dose." : adherence >= 0.5 ? "Hit-and-miss adherence." : "Often skipped.",
      facts,
    },
    good,
    bad,
  };
}

function goalsDomain(inp: ReportInput, start: string): Built | null {
  if (inp.goals.length === 0) return null;
  const logsByGoal = new Map<string, GoalLog[]>();
  for (const l of inp.goalLogs) {
    const arr = logsByGoal.get(l.goal_id) ?? [];
    arr.push(l);
    logsByGoal.set(l.goal_id, arr);
  }

  const progresses = inp.goals.map((g) => progressPct(g, logsByGoal.get(g.id) ?? []));
  const avgProgress = progresses.reduce((a, b) => a + b, 0) / inp.goals.length;

  const recentLogs = inp.goalLogs.filter((l) => l.logged_on >= start && l.logged_on <= inp.todayStr);
  const checkinDays = new Set(recentLogs.map((l) => l.logged_on)).size;
  // Gentle: ~4 check-ins in the period already counts as full momentum (goals
  // aren't always daily habits).
  const momentum = clamp(checkinDays * 25);

  const overdue = inp.goals.filter((g) => deadlineState(g) === "overdue").length;
  const soon = inp.goals.filter((g) => deadlineState(g) === "soon").length;

  let score = clamp(avgProgress * 0.5 + momentum * 0.5);
  if (overdue > 0) score = clamp(score - overdue * 8);

  const facts = [
    `${inp.goals.length} active goal${inp.goals.length === 1 ? "" : "s"}, avg ${Math.round(avgProgress)}% to target`,
    checkinDays > 0 ? `Checked in on ${checkinDays} day${checkinDays === 1 ? "" : "s"} recently` : "No recent check-ins",
    overdue > 0 ? `${overdue} past its deadline` : soon > 0 ? `${soon} due within a week` : "Deadlines on track",
  ];

  const good: string[] = [];
  const bad: string[] = [];
  if (avgProgress >= 60) good.push(`Goals are moving — ${Math.round(avgProgress)}% to target on average.`);
  if (checkinDays >= 4) good.push(`Staying engaged with ${checkinDays} goal check-ins recently.`);
  if (checkinDays === 0) bad.push(`No goal check-ins this period — a quick update keeps momentum.`);
  if (overdue > 0) bad.push(`${overdue} goal${overdue === 1 ? "" : "s"} past deadline — adjust or push.`);

  return {
    domain: {
      id: "goals",
      label: "Goals",
      icon: "goals",
      score,
      tone: toneFor(score),
      summary: score >= 70 ? "Goals on track and active." : score >= 45 ? "Some movement, some drift." : "Goals need attention.",
      facts,
    },
    good,
    bad,
  };
}

// --- assemble --------------------------------------------------------------
export function buildReport(inp: ReportInput): Report {
  const start = windowStart(inp.todayStr, inp.days);
  const builders = [training, nutrition, gaming, mind, supplements, goalsDomain];
  const built = builders.map((b) => b(inp, start)).filter((x): x is Built => x !== null);

  const domains = built.map((b) => b.domain);
  const overall = domains.length
    ? Math.round(domains.reduce((a, d) => a + d.score, 0) / domains.length)
    : null;

  // Strengths/focus: domain-level points, ordered by how good/bad the domain is.
  const strengths: ReportPoint[] = [];
  const focus: ReportPoint[] = [];
  const byScore = [...built].sort((a, b) => b.domain.score - a.domain.score);
  for (const b of byScore) {
    for (const text of b.good) strengths.push({ domain: b.domain.label, text });
  }
  for (const b of [...built].sort((a, b) => a.domain.score - b.domain.score)) {
    for (const text of b.bad) focus.push({ domain: b.domain.label, text });
  }

  // Fallbacks so the columns are never empty when there's data.
  if (strengths.length === 0 && byScore[0]) {
    strengths.push({ domain: byScore[0].domain.label, text: byScore[0].domain.summary });
  }
  if (focus.length === 0) {
    const lowest = [...domains].sort((a, b) => a.score - b.score)[0];
    if (lowest) focus.push({ domain: lowest.label, text: `Your lowest area right now — ${lowest.summary.toLowerCase()}` });
  }

  const { grade, headline } = gradeFor(overall, domains.length);
  return {
    overall,
    grade,
    headline,
    domains,
    strengths: strengths.slice(0, 6),
    focus: focus.slice(0, 6),
  };
}

function gradeFor(overall: number | null, count: number): { grade: string; headline: string } {
  if (overall === null || count === 0) {
    return { grade: "—", headline: "Track a few things and your report card fills in." };
  }
  if (overall >= 80) return { grade: "Excellent", headline: "You're firing on all cylinders — keep the rhythm." };
  if (overall >= 67) return { grade: "Strong", headline: "Solid all-round week with a couple of edges to sharpen." };
  if (overall >= 52) return { grade: "Steady", headline: "A balanced base — one or two areas to push." };
  if (overall >= 38) return { grade: "Patchy", headline: "Some bright spots; a few habits are slipping." };
  return { grade: "Needs care", headline: "A quiet stretch — pick one area to restart with." };
}
