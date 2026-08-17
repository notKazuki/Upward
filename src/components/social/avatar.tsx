import { initialsOf, type PublicProfile } from "@/lib/social";

/** Round avatar with an initials fallback and an optional ring colour.
 * Presentational (no client needed). */
export default function Avatar({
  profile,
  size = 40,
  frameColor,
}: {
  profile: PublicProfile;
  size?: number;
  frameColor?: string | null;
}) {
  const initials = initialsOf(profile);
  const color = frameColor ?? null;
  const gap = Math.max(2, Math.round(size * 0.03));
  const ring = Math.max(2, Math.round(size * 0.045));
  // box-shadow ring keeps the layout footprint unchanged (no shift).
  const frameStyle = color
    ? { boxShadow: `0 0 0 ${gap}px var(--color-card), 0 0 0 ${gap + ring}px ${color}` }
    : undefined;

  if (profile.avatar_url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={profile.avatar_url}
        alt=""
        width={size}
        height={size}
        className={`shrink-0 rounded-full object-cover ${color ? "" : "ring-1 ring-line"}`}
        style={{ width: size, height: size, ...frameStyle }}
      />
    );
  }
  return (
    <div
      className="grid shrink-0 place-items-center rounded-full bg-ink font-semibold text-paper-bright"
      style={{ width: size, height: size, fontSize: size * 0.38, ...frameStyle }}
      aria-hidden
    >
      {initials}
    </div>
  );
}
