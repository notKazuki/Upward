import { initialsOf, type PublicProfile } from "@/lib/social";

/** Round avatar with an initials fallback. Presentational (no client needed). */
export default function Avatar({
  profile,
  size = 40,
}: {
  profile: PublicProfile;
  size?: number;
}) {
  const initials = initialsOf(profile);
  if (profile.avatar_url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={profile.avatar_url}
        alt=""
        width={size}
        height={size}
        className="shrink-0 rounded-full object-cover ring-1 ring-line"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      className="grid shrink-0 place-items-center rounded-full bg-ink font-semibold text-paper-bright"
      style={{ width: size, height: size, fontSize: size * 0.38 }}
      aria-hidden
    >
      {initials}
    </div>
  );
}
