// Upward Pro — pricing + feature source of truth. PURE module (no env, no DB)
// so it's safe to import from client and server alike. Entitlement reads live in
// pro-data.ts (server-only); billing is scaffolded dormant behind a flag there.

export const PRO = {
  currency: "$",
  monthly: 6,
  annual: 48, // ~2 months free
} as const;

export const ANNUAL_PER_MONTH = +(PRO.annual / 12).toFixed(2); // 4.00
export const ANNUAL_SAVING_PCT = Math.round((1 - PRO.annual / (PRO.monthly * 12)) * 100); // 33

export type PlanInterval = "monthly" | "annual";

// Free users get a daily taste of the AI Sherpa; Pro is unlimited.
export const FREE_SHERPA_DAILY = 3;

// How far back free accounts can export their history; Pro exports everything.
export const FREE_HISTORY_DAYS = 60;

// Headline Pro features — the pricing page hero grid + upsell copy.
export type ProFeature = { title: string; desc: string };
export const PRO_FEATURES: ProFeature[] = [
  {
    title: "Your AI coach",
    desc: "Unlimited conversations with your Claude-powered coach, grounded in everything you track.",
  },
  {
    title: "Smart Log",
    desc: "Talk or type your whole day in one go — your coach files it into the right trackers for you.",
  },
  {
    title: "Deep insights",
    desc: "The full cross-domain engine — what your training does to your mood, your sleep to your aim, and more.",
  },
  {
    title: "Full history & export",
    desc: "Your whole timeline, unlocked — and a one-click export of all your data.",
  },
];

// Free vs Pro comparison rows for the pricing table. A string is a qualifier;
// a boolean renders as a check / dash.
export type CompareRow = { label: string; free: string | boolean; pro: string | boolean };
export const COMPARE: CompareRow[] = [
  { label: "Tracking, Today & calendar", free: true, pro: true },
  { label: "Levels, streaks & milestones", free: true, pro: true },
  { label: "Daily brief from your coach", free: true, pro: true },
  { label: "Friends & profiles", free: true, pro: true },
  { label: "Coach conversations", free: "A taste", pro: "Unlimited" },
  { label: "Smart Log (voice → entries)", free: false, pro: true },
  { label: "Cross-domain insights", free: "Overall score", pro: "Full depth" },
  { label: "History & export", free: "60 days", pro: "Unlimited + export" },
];
