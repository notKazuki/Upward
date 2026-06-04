/**
 * Small stroke icon set (Lucide-style). SVG only — no emoji icons.
 */
export type IconName =
  | "dashboard"
  | "workout"
  | "meal"
  | "supplement"
  | "calendar"
  | "goals"
  | "gaming"
  | "settings"
  | "account"
  | "signout"
  | "chevronLeft"
  | "chevronRight"
  | "menu"
  | "close"
  | "user"
  | "external"
  | "flame"
  | "trendUp"
  | "check"
  | "journal"
  | "trophy"
  | "message";

const paths: Record<IconName, React.ReactNode> = {
  dashboard: (
    <>
      <rect x="3" y="3" width="7" height="9" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="16" width="7" height="5" rx="1.5" />
    </>
  ),
  workout: (
    <>
      <path d="M6.5 6.5 17.5 17.5" />
      <path d="M4 9 2.5 7.5 M4 15l-1.5 1.5 M9 4 7.5 2.5 M15 20l1.5 1.5" />
      <rect x="3" y="7" width="4" height="10" rx="1" transform="rotate(45 5 12)" />
      <rect x="17" y="7" width="4" height="10" rx="1" transform="rotate(45 19 12)" />
    </>
  ),
  meal: (
    <>
      <path d="M5 3v8a3 3 0 0 0 6 0V3" />
      <path d="M8 3v18" />
      <path d="M17 3c-1.5 0-3 2-3 5s1.5 4 3 4 3-1 3-4-1.5-5-3-5Z" />
      <path d="M17 12v9" />
    </>
  ),
  supplement: (
    <>
      <rect x="3" y="8" width="18" height="8" rx="4" transform="rotate(45 12 12)" />
      <path d="M9 9 15 15" />
    </>
  ),
  calendar: (
    <>
      <rect x="3" y="4.5" width="18" height="16" rx="2" />
      <path d="M3 9h18 M8 2.5v4 M16 2.5v4" />
    </>
  ),
  goals: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="4.5" />
      <circle cx="12" cy="12" r="0.8" fill="currentColor" stroke="none" />
    </>
  ),
  gaming: (
    <>
      <line x1="6" x2="10" y1="12" y2="12" />
      <line x1="8" x2="8" y1="10" y2="14" />
      <line x1="15" x2="15.01" y1="13" y2="13" />
      <line x1="18" x2="18.01" y1="11" y2="11" />
      <path d="M17.32 6H6.68a4 4 0 0 0-3.98 3.59c-.08.67-.7 5.71-.7 7.41a3 3 0 0 0 3 3c1 0 1.5-.5 2-1l1.41-1.41A2 2 0 0 1 9.83 17h4.34a2 2 0 0 1 1.41.59L17 19c.5.5 1 1 2 1a3 3 0 0 0 3-3c0-1.7-.62-6.74-.7-7.41A4 4 0 0 0 17.32 6Z" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
    </>
  ),
  account: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4 3.5-6 8-6s8 2 8 6" />
    </>
  ),
  signout: (
    <>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5 M21 12H9" />
    </>
  ),
  chevronLeft: <path d="M15 6l-6 6 6 6" />,
  chevronRight: <path d="M9 6l6 6-6 6" />,
  menu: <path d="M3 6h18M3 12h18M3 18h18" />,
  close: <path d="M6 6l12 12M18 6 6 18" />,
  user: (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="10" r="3" />
      <path d="M6.5 18.5c1-2.4 3-3.5 5.5-3.5s4.5 1.1 5.5 3.5" />
    </>
  ),
  external: (
    <>
      <path d="M14 4h6v6 M20 4l-9 9" />
      <path d="M18 14v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h5" />
    </>
  ),
  flame: (
    <path d="M12 3c1 3 4 4.5 4 8a4 4 0 0 1-8 0c0-1.2.4-2 1-2.8C9 10 9 11.5 10 12c-.3-2 .7-3.7 2-4 .2 1 .8 1.6 0-5Z" />
  ),
  trendUp: (
    <>
      <path d="M3 17l6-6 4 4 7-7" />
      <path d="M17 7h4v4" />
    </>
  ),
  check: <path d="M5 12l5 5 9-11" />,
  journal: (
    <>
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </>
  ),
  trophy: (
    <>
      <path d="M6 4h12v4a6 6 0 0 1-12 0V4Z" />
      <path d="M6 6H3.5a2.5 2.5 0 0 0 0 5H6M18 6h2.5a2.5 2.5 0 0 1 0 5H18" />
      <path d="M9 20h6M12 14v6" />
    </>
  ),
  message: (
    <path d="M21 11.5a8.4 8.4 0 0 1-8.5 8.5 8.6 8.6 0 0 1-4-1L3 21l2-5.5A8.5 8.5 0 0 1 12.5 3 8.4 8.4 0 0 1 21 11.5Z" />
  ),
};

export default function Icon({
  name,
  size = 22,
  className = "",
  strokeWidth = 1.7,
}: {
  name: IconName;
  size?: number;
  className?: string;
  strokeWidth?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      {paths[name]}
    </svg>
  );
}
