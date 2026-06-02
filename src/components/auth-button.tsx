"use client";

type Mode = "signin" | "signup";

/** Opens the auth overlay (instead of navigating to a page). */
export function openAuth(mode: Mode) {
  window.dispatchEvent(
    new CustomEvent("upward:open-auth", { detail: { mode } }),
  );
}

export default function AuthButton({
  mode,
  className,
  children,
  ariaLabel,
}: {
  mode: Mode;
  className?: string;
  children: React.ReactNode;
  ariaLabel?: string;
}) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={() => openAuth(mode)}
      className={className}
    >
      {children}
    </button>
  );
}
