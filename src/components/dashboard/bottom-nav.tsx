"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Icon from "@/components/icons";
import { navItems, isNavActive } from "@/lib/nav";

/**
 * Mobile navigation — a native-feeling bottom tab bar. Upward is a daily
 * tracker used on a phone, so the five destinations sit under the thumb
 * instead of behind a hamburger. Hidden from md up, where the sidebar takes
 * over. Safe-area aware so it clears the iOS home indicator in the PWA.
 */
export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Primary"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-paper/90 backdrop-blur-md md:hidden"
    >
      <ul className="flex items-stretch">
        {navItems.map((item) => {
          const active = isNavActive(item.href, pathname);
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className="relative flex h-full min-h-14 flex-col items-center justify-center gap-1 px-1 py-2 transition-colors duration-200 active:bg-card"
              >
                {/* active indicator — a short bar hugging the top edge */}
                <span
                  aria-hidden
                  className={`absolute top-0 h-0.5 w-8 rounded-b-full bg-ember transition-opacity duration-200 ${
                    active ? "opacity-100" : "opacity-0"
                  }`}
                />
                <Icon
                  name={item.icon}
                  size={21}
                  className={active ? "text-ember" : "text-muted"}
                />
                <span
                  className={`text-[0.65rem] font-medium leading-none ${
                    active ? "text-ink" : "text-muted"
                  }`}
                >
                  {item.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
