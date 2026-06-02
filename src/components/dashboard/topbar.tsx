"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Icon from "@/components/icons";
import { createClient } from "@/lib/supabase/client";

export type SessionUser = {
  name: string;
  email: string;
  initials: string;
  avatarUrl: string | null;
};

export default function Topbar({
  user,
  onOpenMenu,
}: {
  user: SessionUser;
  onOpenMenu: () => void;
}) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-line bg-paper/80 px-4 backdrop-blur-md sm:px-6">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onOpenMenu}
          aria-label="Open menu"
          className="grid size-9 cursor-pointer place-items-center rounded-lg text-ink-soft transition-colors hover:bg-card md:hidden"
        >
          <Icon name="menu" size={22} />
        </button>
        <p className="text-sm text-muted">
          Welcome back,{" "}
          <span className="font-medium text-ink-soft">{user.name}</span>
        </p>
      </div>

      <ProfileMenu user={user} />
    </header>
  );
}

function ProfileMenu({ user }: { user: SessionUser }) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function handleSignOut() {
    setPending(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
        className="size-9 cursor-pointer overflow-hidden rounded-full ring-1 ring-line transition-transform duration-200 hover:scale-105"
      >
        {user.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.avatarUrl}
            alt=""
            className="size-full object-cover"
          />
        ) : (
          <span className="grid size-full place-items-center bg-ink text-sm font-semibold text-paper-bright">
            {user.initials}
          </span>
        )}
      </button>

      {open && (
        <div
          role="menu"
          className="u-anim-menu absolute right-0 mt-2 w-60 overflow-hidden rounded-xl border border-line bg-card shadow-[0_18px_50px_-24px_rgba(34,31,26,0.45)]"
        >
          <div className="border-b border-line px-4 py-3">
            <p className="truncate text-sm font-medium text-ink">{user.name}</p>
            <p className="truncate text-xs text-muted">{user.email}</p>
          </div>

          <div className="p-1.5">
            <Link
              href="/app/account"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-ink-soft transition-colors hover:bg-paper"
            >
              <Icon name="account" size={18} />
              Account
            </Link>
            <MenuItem icon="settings" label="Settings" />
          </div>

          <div className="border-t border-line p-1.5">
            <button
              type="button"
              role="menuitem"
              onClick={handleSignOut}
              disabled={pending}
              className="flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-danger transition-colors hover:bg-paper disabled:opacity-60"
            >
              <Icon name="signout" size={18} />
              {pending ? "Signing out…" : "Sign out"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/** Account / Settings — placeholders until those screens exist. */
function MenuItem({
  icon,
  label,
}: {
  icon: "account" | "settings";
  label: string;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      className="flex w-full cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-sm font-medium text-ink-soft transition-colors hover:bg-paper"
    >
      <span className="flex items-center gap-3">
        <Icon name={icon} size={18} />
        {label}
      </span>
      <span className="text-[0.65rem] uppercase tracking-wide text-faint">
        soon
      </span>
    </button>
  );
}
