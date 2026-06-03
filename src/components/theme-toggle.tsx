"use client";

import { useEffect, useState } from "react";

type Mode = "light" | "dark" | "system";

function systemDark() {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function apply(mode: Mode): boolean {
  const dark = mode === "dark" || (mode === "system" && systemDark());
  document.documentElement.classList.toggle("dark", dark);
  return dark;
}

export default function ThemeToggle() {
  const [dark, setDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = (localStorage.getItem("theme") as Mode) || "system";
    setDark(apply(stored));

    // Keep following the OS while the user hasn't made an explicit choice.
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      if (((localStorage.getItem("theme") as Mode) || "system") === "system") {
        setDark(apply("system"));
      }
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  function toggle() {
    const next: Mode = dark ? "light" : "dark";
    localStorage.setItem("theme", next);
    setDark(apply(next));
  }

  // Avoid an icon flash before we know the resolved theme.
  if (!mounted) return null;

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
      title={dark ? "Light mode" : "Dark mode"}
      style={{
        bottom: "calc(1.25rem + env(safe-area-inset-bottom))",
        right: "calc(1.25rem + env(safe-area-inset-right))",
      }}
      className="fixed z-40 grid size-11 cursor-pointer place-items-center rounded-full border border-line bg-card/90 text-ink-soft shadow-[0_8px_24px_-8px_rgba(0,0,0,0.3)] backdrop-blur-md transition-all duration-300 hover:border-ember hover:text-ember"
    >
      <span className="relative block size-5">
        {/* Sun */}
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
          className={`absolute inset-0 transition-all duration-300 ${
            dark ? "scale-100 opacity-100" : "scale-50 opacity-0"
          }`}
        >
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </svg>
        {/* Moon */}
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
          className={`absolute inset-0 transition-all duration-300 ${
            dark ? "scale-50 opacity-0" : "scale-100 opacity-100"
          }`}
        >
          <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
        </svg>
      </span>
    </button>
  );
}
