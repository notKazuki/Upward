"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import ChartFrame from "@/components/charts/chart-frame";
import { useThemeColors } from "@/lib/use-theme-colors";

export default function WinrateChart({
  data,
}: {
  data: { label: string; winRate: number }[];
}) {
  const C = useThemeColors();
  return (
    <ChartFrame height={220}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: -4, bottom: 0 }}>
          <CartesianGrid stroke={C.line} vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: C.muted, fontSize: 12 }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fill: C.muted, fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            width={40}
            unit="%"
          />
          <Tooltip
            contentStyle={{
              backgroundColor: C.card,
              border: `1px solid ${C.line}`,
              borderRadius: 12,
              fontSize: 12,
              color: C.ink,
            }}
            formatter={(v) => [`${v}%`, "Win rate"]}
          />
          <Line
            type="monotone"
            dataKey="winRate"
            stroke={C.ember}
            strokeWidth={2.5}
            dot={{ r: 3, fill: C.ember, strokeWidth: 0 }}
            activeDot={{ r: 5 }}
          />
      </LineChart>
    </ChartFrame>
  );
}
