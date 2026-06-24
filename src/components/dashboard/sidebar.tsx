"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Icon from "@/components/icons";
import { navGroupsFor, isNavActive } from "@/lib/nav";
import type { Experience } from "@/lib/experience";

export default function Sidebar({
  collapsed,
  experience,
  onToggleCollapse,
  onNavigate,
  mobile = false,
}: {
  collapsed: boolean;
  experience: Experience;
  onToggleCollapse?: () => void;
  onNavigate?: () => void;
  mobile?: boolean;
}) {
  const pathname = usePathname();
  const navGroups = navGroupsFor(experience);

  return (
    <aside
      className={`flex h-full flex-col border-r border-line bg-card transition-[width] duration-300 ease-out ${
        collapsed ? "w-[76px]" : "w-64"
      }`}
    >
      {/* Brand */}
      <div className="flex h-16 items-center gap-2.5 px-5">
        <Link
          href="/app"
          onClick={onNavigate}
          aria-label="Upward — dashboard"
          className="flex items-center gap-2.5"
        >
          <span className="grid size-7 shrink-0 place-items-center text-ember">
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
          {!collapsed && (
            <span className="font-display text-xl font-medium tracking-tight text-ink">
              Upward
            </span>
          )}
        </Link>
      </div>

      {/* Nav — grouped into scannable sections */}
      <nav className="flex-1 overflow-y-auto px-3 py-2">
        {navGroups.map((group, gi) => (
          <div key={group.label} className={gi > 0 ? "mt-4" : ""}>
            {collapsed
              ? gi > 0 && <div className="mx-2 mb-3 border-t border-line" />
              : (
                <p className="px-3 pb-1.5 text-[0.65rem] font-semibold uppercase tracking-[0.13em] text-faint">
                  {group.label}
                </p>
              )}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const active = isNavActive(item.href, pathname);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onNavigate}
                    title={collapsed ? item.label : undefined}
                    aria-current={active ? "page" : undefined}
                    className={`relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors duration-200 ${
                      collapsed ? "justify-center" : ""
                    } ${
                      active
                        ? "bg-ember-wash text-ink"
                        : "text-muted hover:bg-paper hover:text-ink"
                    }`}
                  >
                    {active && (
                      <span
                        className={`absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-ember ${
                          collapsed ? "left-0" : ""
                        }`}
                        aria-hidden
                      />
                    )}
                    <Icon name={item.icon} size={20} className={active ? "text-ember" : undefined} />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Collapse toggle (desktop only) */}
      {!mobile && (
        <div className="border-t border-line p-3">
          <button
            type="button"
            onClick={onToggleCollapse}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className={`flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted transition-colors duration-200 hover:bg-paper hover:text-ink ${
              collapsed ? "justify-center" : ""
            }`}
          >
            <Icon name={collapsed ? "chevronRight" : "chevronLeft"} size={20} />
            {!collapsed && <span>Collapse</span>}
          </button>
        </div>
      )}
    </aside>
  );
}
