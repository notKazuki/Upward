import { initialsOf, type PublicProfile } from "@/lib/social";
import { frameColorOf } from "@/lib/cosmetics";

/** Round avatar with an initials fallback and an optional earned frame ring.
 * The frame is read from the profile's equipped cosmetics, or overridden via
 * `frameColor` (for live previews). Presentational (no client needed). */
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
  const color = frameColor ?? frameColorOf(profile.cosmetics?.frame);
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
