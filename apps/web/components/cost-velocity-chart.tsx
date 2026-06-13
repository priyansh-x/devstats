"use client";

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

export function CostVelocityChart({ data }: { data: { date: string; cost: number }[] }) {
  return (
    <div className="h-48">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <XAxis
            dataKey="date"
            tickFormatter={(d) => d.slice(5)}
            tick={{ fill: "#0A0A0A", fontSize: 10, fontFamily: "monospace" }}
            stroke="#0A0A0A"
          />
          <YAxis
            tick={{ fill: "#0A0A0A", fontSize: 10, fontFamily: "monospace" }}
            stroke="#0A0A0A"
            tickFormatter={(v) => `$${v >= 1 ? v.toFixed(0) : v.toFixed(2)}`}
            width={42}
          />
          <Tooltip
            contentStyle={{
              background: "#0A0A0A",
              color: "#FF5A1F",
              border: "1px solid #0A0A0A",
              borderRadius: 0,
              fontFamily: "monospace",
              fontSize: 11,
            }}
            labelStyle={{ color: "#F5F1EA" }}
            formatter={(v: number) => [`$${v.toFixed(3)}`, "Cost"]}
          />
          <Line
            type="monotone"
            dataKey="cost"
            stroke="#FF5A1F"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
