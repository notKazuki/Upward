"use client";

import dynamic from "next/dynamic";

// Recharts is the heaviest client dependency, so load it after the initial
// paint with a skeleton in its place (keeps the dashboard fast to first paint).
function Skeleton() {
  return (
    <div className="h-[240px] w-full animate-pulse rounded-xl bg-paper-bright" />
  );
}

export const ActivityChart = dynamic(
  () => import("./charts").then((m) => m.ActivityChart),
  { ssr: false, loading: Skeleton },
);
export const CategoryChart = dynamic(
  () => import("./charts").then((m) => m.CategoryChart),
  { ssr: false, loading: Skeleton },
);
export const MacroChart = dynamic(
  () => import("./charts").then((m) => m.MacroChart),
  { ssr: false, loading: Skeleton },
);
export const MoodChart = dynamic(
  () => import("./charts").then((m) => m.MoodChart),
  { ssr: false, loading: Skeleton },
);
