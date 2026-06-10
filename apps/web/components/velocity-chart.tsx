"use client";

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

export function VelocityChart({ data }: { data: { date: string; tokens: number }[] }) {
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
            tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}K` : `${v}`)}
            width={36}
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
          />
          <Line
            type="monotone"
            dataKey="tokens"
            stroke="#FF5A1F"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
