"use client";

import type { ReactElement } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import ChartFrame from "@/components/charts/chart-frame";
import { useThemeColors, type ChartColors } from "@/lib/use-theme-colors";

function axis(C: ChartColors) {
  return {
    tick: { fill: C.muted, fontSize: 12 },
    tickLine: false,
    axisLine: false,
  } as const;
}

function tooltip(C: ChartColors) {
  return {
    contentStyle: {
      backgroundColor: C.card,
      border: `1px solid ${C.line}`,
      borderRadius: 12,
      fontSize: 12,
      color: C.ink,
      boxShadow: "0 8px 24px -12px rgba(0,0,0,0.35)",
    },
    labelStyle: { color: C.muted, fontWeight: 600 },
    cursor: { fill: "color-mix(in srgb, currentColor 8%, transparent)" },
  } as const;
}

function Frame({
  children,
}: {
  children: ReactElement<{ width?: number; height?: number }>;
}) {
  return <ChartFrame height={240}>{children}</ChartFrame>;
}

export function ActivityChart({
  data,
}: {
  data: { day: string; minutes: number }[];
}) {
  const C = useThemeColors();
  return (
    <Frame>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -4, bottom: 0 }}>
        <defs>
          <linearGradient id="activityFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={C.ember} stopOpacity={0.35} />
            <stop offset="100%" stopColor={C.ember} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={C.line} vertical={false} />
        <XAxis dataKey="day" {...axis(C)} />
        <YAxis {...axis(C)} width={40} />
        <Tooltip {...tooltip(C)} />
        <Area
          type="monotone"
          dataKey="minutes"
          name="Minutes"
          stroke={C.ember}
          strokeWidth={2.5}
          fill="url(#activityFill)"
          dot={{ r: 3, fill: C.ember, strokeWidth: 0 }}
          activeDot={{ r: 5 }}
        />
      </AreaChart>
    </Frame>
  );
}

export function CategoryChart({
  data,
}: {
  data: { category: string; sessions: number }[];
}) {
  const C = useThemeColors();
  const palette = [C.ember, C.emberSoft, C.emberPale, C.muted];
  return (
    <Frame>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -4, bottom: 0 }}>
        <CartesianGrid stroke={C.line} vertical={false} />
        <XAxis dataKey="category" {...axis(C)} />
        <YAxis {...axis(C)} width={40} allowDecimals={false} />
        <Tooltip {...tooltip(C)} />
        <Bar dataKey="sessions" name="Sessions" radius={[6, 6, 0, 0]}>
          {data.map((_, i) => (
            <Cell key={i} fill={palette[i % palette.length]} />
          ))}
        </Bar>
      </BarChart>
    </Frame>
  );
}

export function GamingChart({
  data,
}: {
  data: { game: string; matches: number }[];
}) {
  const C = useThemeColors();
  const palette = [C.ember, C.emberSoft, C.emberPale, C.muted];
  return (
    <Frame>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -4, bottom: 0 }}>
        <CartesianGrid stroke={C.line} vertical={false} />
        <XAxis dataKey="game" {...axis(C)} />
        <YAxis {...axis(C)} width={40} allowDecimals={false} />
        <Tooltip {...tooltip(C)} />
        <Bar dataKey="matches" name="Matches" radius={[6, 6, 0, 0]}>
          {data.map((_, i) => (
            <Cell key={i} fill={palette[i % palette.length]} />
          ))}
        </Bar>
      </BarChart>
    </Frame>
  );
}
