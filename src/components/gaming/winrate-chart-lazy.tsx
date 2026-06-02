"use client";

import dynamic from "next/dynamic";

const WinrateChart = dynamic(() => import("./winrate-chart"), {
  ssr: false,
  loading: () => (
    <div className="h-[220px] w-full animate-pulse rounded-xl bg-paper-bright" />
  ),
});

export default WinrateChart;
