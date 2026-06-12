import Icon from "@/components/icons";

// Shows only when a live streak is at risk — i.e. the user has a running streak
// but hasn't logged anything yet today. A gentle, single-line urgency cue above
// the daily quests; it disappears the moment they log something.
export default function StreakNudge({ days }: { days: number }) {
  return (
    <div className="u-rise flex items-center gap-3 rounded-2xl border border-ember/40 bg-ember/5 px-5 py-3.5">
      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-ember/15 text-ember">
        <Icon name="flame" size={18} />
      </span>
      <p className="text-sm text-ink-soft">
        Your <span className="font-semibold text-ink">{days}-day streak</span> is at risk — log anything
        today to keep the flame alive.
      </p>
    </div>
  );
}
