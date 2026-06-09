import Link from "next/link";

type Item = { label: string; done: boolean; hint: string };

/**
 * Shown on the dashboard until the user has a username, display name, and
 * photo — the bits that make their profile findable and human. Disappears on
 * its own once everything's set.
 */
export default function ProfileSetupCard({
  hasUsername,
  hasDisplayName,
  hasAvatar,
}: {
  hasUsername: boolean;
  hasDisplayName: boolean;
  hasAvatar: boolean;
}) {
  const items: Item[] = [
    { label: "Pick a username", done: hasUsername, hint: "so friends can find you" },
    { label: "Set a display name", done: hasDisplayName, hint: "shown around the app" },
    { label: "Add a profile photo", done: hasAvatar, hint: "crop it to a square" },
  ];
  const remaining = items.filter((i) => !i.done);
  if (remaining.length === 0) return null;
  const doneCount = items.length - remaining.length;

  return (
    <div className="rounded-2xl border border-ember/40 bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-display text-lg text-ink">Finish setting up your profile</p>
          <p className="text-sm text-muted">
            {doneCount} of {items.length} done — takes about a minute.
          </p>
        </div>
        <Link
          href="/app/account"
          className="cursor-pointer rounded-full bg-ink px-4 py-2 text-sm font-medium text-paper-bright transition-colors hover:bg-ink-soft"
        >
          Complete profile
        </Link>
      </div>
      <ul className="mt-4 grid gap-2 sm:grid-cols-3">
        {items.map((i) => (
          <li
            key={i.label}
            className={`flex items-center gap-2.5 rounded-xl border px-3 py-2.5 ${
              i.done ? "border-line bg-paper-bright" : "border-dashed border-line-strong"
            }`}
          >
            <span
              className={`grid size-5 shrink-0 place-items-center rounded-full ${
                i.done ? "bg-ember/15 text-ember" : "bg-line text-faint"
              }`}
              aria-hidden
            >
              {i.done ? (
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5 9-11" /></svg>
              ) : (
                <span className="size-1.5 rounded-full bg-current" />
              )}
            </span>
            <span className="min-w-0">
              <span className={`block truncate text-sm ${i.done ? "text-muted line-through" : "font-medium text-ink"}`}>
                {i.label}
              </span>
              {!i.done && <span className="block truncate text-xs text-faint">{i.hint}</span>}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
