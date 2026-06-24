import type { IconName } from "@/components/icons";
import type { Experience } from "@/lib/experience";

export type NavItem = {
  label: string;
  href: string;
  icon: IconName;
};

export type NavGroup = {
  label: string;
  items: NavItem[];
};

/** Primary navigation, grouped into scannable sections. "Upgrade" lives in the
 * top bar (a Pro pill), not here. */
export const navGroups: NavGroup[] = [
  {
    label: "Home",
    items: [
      { label: "Dashboard", href: "/app", icon: "dashboard" },
      { label: "Insights", href: "/app/insights", icon: "trendUp" },
    ],
  },
  {
    label: "Play",
    items: [
      { label: "Quick Log", href: "/app/log", icon: "mic" },
      { label: "Character", href: "/app/character", icon: "flame" },
      { label: "Progress", href: "/app/progress", icon: "trophy" },
    ],
  },
  {
    label: "Track",
    items: [
      { label: "Workout", href: "/app/workout", icon: "workout" },
      { label: "Meal", href: "/app/meal", icon: "meal" },
      { label: "Supplement", href: "/app/supplement", icon: "supplement" },
      { label: "Gaming", href: "/app/gaming", icon: "gaming" },
      { label: "Journal", href: "/app/journal", icon: "journal" },
      { label: "Goals", href: "/app/goals", icon: "goals" },
      { label: "Calendar", href: "/app/calendar", icon: "calendar" },
    ],
  },
  {
    label: "Social",
    items: [
      { label: "Friends", href: "/app/friends", icon: "user" },
      { label: "Chat", href: "/app/chat", icon: "message" },
    ],
  },
];

// Classic mode swaps the RPG "Play" group for a plain "You" group: Quick Log +
// a clean Stats page (no Character sheet, no Progress/achievements in nav).
const classicGroups: NavGroup[] = navGroups.map((g) =>
  g.label === "Play"
    ? {
        label: "You",
        items: [
          { label: "Quick Log", href: "/app/log", icon: "mic" },
          { label: "Stats", href: "/app/stats", icon: "stats" },
        ],
      }
    : g,
);

/** Navigation for the user's experience mode. */
export function navGroupsFor(experience: Experience): NavGroup[] {
  return experience === "classic" ? classicGroups : navGroups;
}

/** Flat list (derived, gamified superset) for lookups. */
export const navItems: NavItem[] = navGroups.flatMap((g) => g.items);

/** True when `pathname` is on (or under) this item's route. */
export function isNavActive(href: string, pathname: string): boolean {
  return href === "/app" ? pathname === "/app" : pathname === href || pathname.startsWith(`${href}/`);
}
