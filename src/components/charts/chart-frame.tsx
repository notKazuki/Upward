"use client";

import {
  cloneElement,
  useEffect,
  useRef,
  useState,
  type ReactElement,
} from "react";

/**
 * Sizes a Recharts chart from a single ResizeObserver instead of Recharts'
 * own ResponsiveContainer.
 *
 * ResponsiveContainer measures its container as width/height -1 at mount and
 * re-measures on a loop. In Brave (which throttles ResizeObserver/rAF harder
 * than Chrome) that loop spams the console with "width(-1)" warnings and burns
 * frames re-rendering the chart. We measure once, render the chart at an
 * explicit pixel size, and update only when the width actually changes — no
 * warnings, no churn.
 */
export default function ChartFrame({
  height,
  children,
}: {
  height: number;
  children: ReactElement<{ width?: number; height?: number }>;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const w = Math.round(entries[0].contentRect.width);
      setWidth((prev) => (prev === w ? prev : w));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={ref} style={{ width: "100%", height }}>
      {width > 0 ? cloneElement(children, { width, height }) : null}
    </div>
  );
}
