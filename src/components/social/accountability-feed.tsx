import Link from "next/link";
import Avatar from "@/components/social/avatar";
import Icon from "@/components/icons";
import { profileName } from "@/lib/social";
import type { FeedEntry } from "@/lib/social-data";

function relativeDay(date: string | null): string {
  if (!date) return "no activity yet";
  const today = new Date();
  const t = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  if (date === t) return "logged today";
  const d = new Date(`${date}T00:00:00`);
  const diff = Math.round((new Date(`${t}T00:00:00`).getTime() - d.getTime()) / 86_400_000);
  if (diff === 1) return "logged yesterday";
  if (diff < 7) return `logged ${diff} days ago`;
  return `last logged ${d.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;
}

/** Who's showing up — a quiet accountability feed of friends who share stats. */
export default function AccountabilityFeed({ entries }: { entries: FeedEntry[] }) {
  if (entries.length === 0) return null;

  return (
    <section className="rounded-2xl border border-line bg-card p-6">
      <h2 className="font-display text-xl text-ink">Showing up</h2>
      <p className="mt-1 text-sm text-muted">
        How your friends have been doing lately — only what they choose to share.
      </p>

      <ul className="mt-4 space-y-2">
        {entries.map(({ profile, streak, activeDays7, lastActive }) => (
          <li key={profile.id}>
            <Link
              href={profile.username ? `/app/u/${profile.username}` : "/app/friends"}
              className="flex items-center gap-3 rounded-xl border border-line bg-paper-bright p-3 transition-colors hover:border-ember/50"
            >
              <Avatar profile={profile} size={38} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-ink">
                  {profileName(profile)}
                </span>
                <span className="block truncate text-xs text-muted">
                  {relativeDay(lastActive)} · {activeDays7} active day
                  {activeDays7 === 1 ? "" : "s"} this week
                </span>
              </span>
              {streak > 0 && (
                <span className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-ink-soft">
                  <Icon name="flame" size={14} className="text-ember" />
                  {streak}
                </span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
