import type { IconName } from "@/components/icons";

export type NavItem = {
  label: string;
  href: string;
  icon: IconName;
};

/**
 * Primary navigation — one calm, flat spine. Everyday logging happens through
 * the global capture ("+" / Ctrl-K) and on Today, so it isn't a nav entry.
 * "Upgrade" lives in the top bar (a Pro pill), not here.
 */
export const navItems: NavItem[] = [
  { label: "Today", href: "/app", icon: "dashboard" },
  { label: "Coach", href: "/app/coach", icon: "sparkle" },
  { label: "Insights", href: "/app/insights", icon: "trendUp" },
  { label: "You", href: "/app/stats", icon: "stats" },
  { label: "Friends", href: "/app/friends", icon: "user" },
];

/** True when `pathname` is on (or under) this item's route. */
export function isNavActive(href: string, pathname: string): boolean {
  return href === "/app"
    ? pathname === "/app"
    : pathname === href || pathname.startsWith(`${href}/`);
}
