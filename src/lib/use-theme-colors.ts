"use client";

import { useEffect, useState } from "react";

export type ChartColors = {
  ember: string;
  emberSoft: string;
  emberPale: string;
  muted: string;
  line: string;
  card: string;
  paperBright: string;
  ink: string;
};

// Light fallback for the first client render (before we can read the DOM).
const LIGHT: ChartColors = {
  ember: "#bc572f",
  emberSoft: "#d4825a",
  emberPale: "#e8b48f",
  muted: "#7c7367",
  line: "#e4dccd",
  card: "#fbf7f0",
  paperBright: "#faf5ec",
  ink: "#221f1a",
};

function read(): ChartColors {
  const s = getComputedStyle(document.documentElement);
  const v = (n: string, fallback: string) =>
    s.getPropertyValue(n).trim() || fallback;
  return {
    ember: v("--ember", LIGHT.ember),
    emberSoft: v("--ember-soft", LIGHT.emberSoft),
    emberPale: v("--ember-pale", LIGHT.emberPale),
    muted: v("--muted", LIGHT.muted),
    line: v("--line", LIGHT.line),
    card: v("--card", LIGHT.card),
    paperBright: v("--paper-bright", LIGHT.paperBright),
    ink: v("--ink", LIGHT.ink),
  };
}

/** Live chart colors that follow the active theme. */
export function useThemeColors(): ChartColors {
  const [colors, setColors] = useState<ChartColors>(LIGHT);

  useEffect(() => {
    setColors(read());
    const obs = new MutationObserver(() => setColors(read()));
    obs.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => obs.disconnect();
  }, []);

  return colors;
}
