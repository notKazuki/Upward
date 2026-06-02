import Link from "next/link";

/**
 * Upward wordmark — an ascending mark + the name in the display serif.
 */
export default function Logo({ className = "" }: { className?: string }) {
  return (
    <Link
      href="/"
      aria-label="Upward — home"
      className={`group inline-flex items-center gap-2.5 ${className}`}
    >
      <span className="grid size-7 place-items-center text-ember transition-transform duration-300 ease-out group-hover:-translate-y-0.5">
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.1"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M12 19V6" />
          <path d="M5.5 12.5 12 5.5l6.5 7" />
        </svg>
      </span>
      <span className="font-display text-[1.35rem] font-medium tracking-tight text-ink">
        Upward
      </span>
    </Link>
  );
}
