"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  macros,
  moodTrend,
  weeklyActivity,
  workoutsByCategory,
} from "@/lib/sample-data";

// Palette (kept in sync with globals.css tokens).
const C = {
  ink: "#221f1a",
  ember: "#bc572f",
  emberSoft: "#d4825a",
  emberPale: "#e8b48f",
  muted: "#7c7367",
  line: "#e4dccd",
  paperBright: "#faf5ec",
};

const axisProps = {
  tick: { fill: C.muted, fontSize: 12 },
  tickLine: false,
  axisLine: false,
} as const;

const tooltipStyle = {
  contentStyle: {
    backgroundColor: C.paperBright,
    border: `1px solid ${C.line}`,
    borderRadius: 12,
    fontSize: 12,
    color: C.ink,
    boxShadow: "0 8px 24px -12px rgba(34,31,26,0.4)",
  },
  labelStyle: { color: C.muted, fontWeight: 600 },
  cursor: { fill: "rgba(188,87,47,0.06)" },
} as const;

function Frame({ children }: { children: React.ReactElement }) {
  return (
    <div className="h-[240px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        {children}
      </ResponsiveContainer>
    </div>
  );
}

export function ActivityChart() {
  return (
    <Frame>
      <AreaChart
        data={weeklyActivity}
        margin={{ top: 8, right: 8, left: -18, bottom: 0 }}
      >
        <defs>
          <linearGradient id="activityFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={C.ember} stopOpacity={0.35} />
            <stop offset="100%" stopColor={C.ember} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={C.line} vertical={false} />
        <XAxis dataKey="day" {...axisProps} />
        <YAxis {...axisProps} width={40} />
        <Tooltip {...tooltipStyle} />
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

export function CategoryChart() {
  return (
    <Frame>
      <BarChart
        data={workoutsByCategory}
        margin={{ top: 8, right: 8, left: -18, bottom: 0 }}
      >
        <CartesianGrid stroke={C.line} vertical={false} />
        <XAxis dataKey="category" {...axisProps} />
        <YAxis {...axisProps} width={40} />
        <Tooltip {...tooltipStyle} />
        <Bar dataKey="sessions" name="Sessions" radius={[6, 6, 0, 0]}>
          {workoutsByCategory.map((_, i) => (
            <Cell
              key={i}
              fill={[C.ember, C.emberSoft, C.emberPale, C.muted][i % 4]}
            />
          ))}
        </Bar>
      </BarChart>
    </Frame>
  );
}

export function MacroChart() {
  const colors = [C.ember, C.emberSoft, C.emberPale];
  return (
    <div>
      <div className="h-[200px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Tooltip {...tooltipStyle} />
            <Pie
              data={macros}
              dataKey="grams"
              nameKey="name"
              innerRadius={52}
              outerRadius={80}
              paddingAngle={2}
              stroke="none"
            >
              {macros.map((_, i) => (
                <Cell key={i} fill={colors[i % colors.length]} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="mt-2 flex justify-center gap-4">
        {macros.map((m, i) => (
          <li key={m.name} className="flex items-center gap-1.5 text-xs text-muted">
            <span
              className="inline-block size-2.5 rounded-full"
              style={{ backgroundColor: colors[i % colors.length] }}
            />
            {m.name}
            <span className="font-medium text-ink-soft">{m.grams}g</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function MoodChart() {
  return (
    <Frame>
      <LineChart
        data={moodTrend}
        margin={{ top: 8, right: 8, left: -28, bottom: 0 }}
      >
        <CartesianGrid stroke={C.line} vertical={false} />
        <XAxis dataKey="day" {...axisProps} />
        <YAxis domain={[0, 5]} {...axisProps} width={40} />
        <Tooltip {...tooltipStyle} />
        <Line
          type="monotone"
          dataKey="mood"
          name="Mood"
          stroke={C.ember}
          strokeWidth={2.5}
          dot={{ r: 3, fill: C.ember, strokeWidth: 0 }}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </Frame>
  );
}
