"use client";

import { useState } from "react";
import Atmosphere from "@/components/atmosphere";
import QuickAdd from "@/components/quick-add";
import Sidebar from "./sidebar";
import BottomNav from "./bottom-nav";
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

      {/* Main column. The bottom padding clears the mobile tab bar. */}
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar user={user} isPro={isPro} />
        <main className="flex-1 px-4 pb-28 pt-6 sm:px-6 md:pb-6 lg:px-8">{children}</main>
      </div>

      <QuickAdd />
      <BottomNav />
    </div>
  );
}
