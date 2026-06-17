import type { IconName } from "@/components/icons";

export type NavItem = {
  label: string;
  href: string;
  icon: IconName;
};

/** Primary sidebar navigation. */
export const navItems: NavItem[] = [
  { label: "Dashboard", href: "/app", icon: "dashboard" },
  { label: "Quick Log", href: "/app/log", icon: "mic" },
  { label: "Character", href: "/app/character", icon: "flame" },
  { label: "Insights", href: "/app/insights", icon: "trendUp" },
  { label: "Workout", href: "/app/workout", icon: "workout" },
  { label: "Meal", href: "/app/meal", icon: "meal" },
  { label: "Supplement", href: "/app/supplement", icon: "supplement" },
  { label: "Gaming", href: "/app/gaming", icon: "gaming" },
  { label: "Calendar", href: "/app/calendar", icon: "calendar" },
  { label: "Journal", href: "/app/journal", icon: "journal" },
  { label: "Goals", href: "/app/goals", icon: "goals" },
  { label: "Progress", href: "/app/progress", icon: "trophy" },
  { label: "Friends", href: "/app/friends", icon: "user" },
  { label: "Chat", href: "/app/chat", icon: "message" },
  { label: "Upgrade", href: "/app/upgrade", icon: "sparkle" },
];
