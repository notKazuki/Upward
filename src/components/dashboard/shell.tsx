"use client";

import { useState } from "react";
import Atmosphere from "@/components/atmosphere";
import QuickAdd from "@/components/quick-add";
import Sidebar from "./sidebar";
import Topbar, { type SessionUser } from "./topbar";

export default function DashboardShell({
  initialCollapsed,
  user,
  isPro,
  children,
}: {
  initialCollapsed: boolean;
  user: SessionUser;
  isPro: boolean;
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(initialCollapsed);
  const [mobileOpen, setMobileOpen] = useState(false);

  function toggleCollapsed() {
    setCollapsed((c) => {
      const next = !c;
      document.cookie = `sidebar=${
        next ? "collapsed" : "expanded"
      }; path=/; max-age=31536000; samesite=lax`;
      return next;
    });
  }

  return (
    <div className="flex min-h-dvh">
      <Atmosphere />
      {/* Desktop sidebar */}
      <div className="sticky top-0 hidden h-dvh shrink-0 md:block">
        <Sidebar collapsed={collapsed} onToggleCollapse={toggleCollapsed} />
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setMobileOpen(false)}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          />
          <div className="u-anim-drawer absolute inset-y-0 left-0 h-full">
            <Sidebar
              collapsed={false}
              mobile
              onNavigate={() => setMobileOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar user={user} isPro={isPro} onOpenMenu={() => setMobileOpen(true)} />
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>

      <QuickAdd />
    </div>
  );
}
