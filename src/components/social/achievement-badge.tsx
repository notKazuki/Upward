import { TIERS, type Achievement } from "@/lib/achievements";

export default function AchievementBadge({
  achievement,
  earned,
  earnedOn,
}: {
  achievement: Achievement;
  earned: boolean;
  earnedOn?: string;
}) {
  const tier = TIERS[achievement.tier];
  const date =
    earned && earnedOn
      ? new Date(`${earnedOn}T00:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
      : null;

  return (
    <div
      className={`flex items-center gap-3 rounded-xl border p-3 transition-colors ${
        earned ? "border-line bg-paper-bright" : "border-dashed border-line bg-card/40"
      }`}
      title={achievement.description}
    >
      <span
        className="grid size-10 shrink-0 place-items-center rounded-full"
        style={
          earned
            ? { backgroundColor: `${tier.color}22`, color: tier.color }
            : { backgroundColor: "var(--color-line)", color: "var(--color-faint, #a89e8f)" }
        }
        aria-hidden
      >
        {earned ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M12 2l2.9 6.1 6.6.9-4.8 4.6 1.2 6.6L12 18.9 6.1 20.2l1.2-6.6L2.5 9l6.6-.9L12 2z" />
          </svg>
        ) : (
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <rect x="5" y="11" width="14" height="10" rx="2" />
            <path d="M8 11V7a4 4 0 0 1 8 0v4" />
          </svg>
        )}
      </span>
      <div className="min-w-0">
        <p className={`truncate text-sm font-medium ${earned ? "text-ink" : "text-faint"}`}>
          {achievement.label}
        </p>
        <p className="truncate text-xs text-muted">{achievement.description}</p>
        {date && <p className="text-[0.7rem] text-faint">Earned {date}</p>}
      </div>
    </div>
  );
}
