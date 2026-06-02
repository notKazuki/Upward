import type { IconName } from "@/components/icons";

export type NavItem = {
  label: string;
  href: string;
  icon: IconName;
};

/** Primary sidebar navigation. */
export const navItems: NavItem[] = [
  { label: "Dashboard", href: "/app", icon: "dashboard" },
  { label: "Workout", href: "/app/workout", icon: "workout" },
  { label: "Meal", href: "/app/meal", icon: "meal" },
  { label: "Supplement", href: "/app/supplement", icon: "supplement" },
  { label: "Gaming", href: "/app/gaming", icon: "gaming" },
  { label: "Calendar", href: "/app/calendar", icon: "calendar" },
  { label: "Goals", href: "/app/goals", icon: "goals" },
];
