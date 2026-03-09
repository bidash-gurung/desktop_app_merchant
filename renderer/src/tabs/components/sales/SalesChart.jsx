// src/tabs/components/sales/SalesChart.jsx
import React from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";

export default function SalesChart({ data }) {
  if (!data || data.length === 0) {
    return <div className="slEmpty">No data for the selected filter.</div>;
  }

  return (
    <ResponsiveContainer width="100%" height={320}>
      <LineChart
        data={data}
        margin={{ top: 10, right: 18, left: 6, bottom: 10 }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 12 }}
          interval="preserveStartEnd"
          minTickGap={18}
        />
        <YAxis tick={{ fontSize: 12 }} />
        <Tooltip formatter={(v) => money(v)} />
        <Line type="monotone" dataKey="amount" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

function money(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return "Nu. 0.00";
  return `Nu. ${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
