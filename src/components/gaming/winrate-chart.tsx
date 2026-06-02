"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const C = {
  ember: "#bc572f",
  muted: "#7c7367",
  line: "#e4dccd",
  paperBright: "#faf5ec",
  ink: "#221f1a",
};

export default function WinrateChart({
  data,
}: {
  data: { label: string; winRate: number }[];
}) {
  return (
    <div className="h-[220px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
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
              backgroundColor: C.paperBright,
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
      </ResponsiveContainer>
    </div>
  );
}
