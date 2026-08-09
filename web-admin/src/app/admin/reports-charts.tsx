"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const STATUS_COLORS: Record<string, string> = {
  REPORTED: "#f59e0b",
  INVESTIGATING: "#3b82f6",
  ROOT_CAUSE_FOUND: "#8b5cf6",
  ASSIGNED: "#06b6d4",
  IN_PROGRESS: "#ec4899",
  DONE: "#10b981",
};

function ChartCard({
  title,
  color,
  wide,
  height = 270,
  children,
}: {
  title: string;
  color: string;
  wide?: boolean;
  height?: number;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.03)] ${
        wide ? "lg:col-span-2" : ""
      }`}
    >
      <div className="mb-4 flex items-center gap-2.5">
        <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />
        <h2 className="text-xs font-bold text-slate-700">{title}</h2>
      </div>
      <div style={{ width: "100%", height }}>{children}</div>
    </div>
  );
}

const tooltipStyle = {
  borderRadius: "12px",
  border: "1px solid #e2e8f0",
  boxShadow: "0 4px 12px rgba(0,0,0,0.04)",
  fontSize: "11px",
  fontFamily: "inherit",
};

export default function ReportsCharts({
  issuesByStatus,
  issuesByDay,
  issuesByArea,
}: {
  issuesByStatus: { status: string; statusLabel: string; count: number }[];
  issuesByDay: { date: string; count: number }[];
  issuesByArea: { area: string; count: number }[];
}) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <ChartCard title="Phân Bố Trạng Thái Sự Cố" color="#10b981">
        <ResponsiveContainer>
          <PieChart>
            <Pie
              data={issuesByStatus}
              dataKey="count"
              nameKey="statusLabel"
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={88}
              paddingAngle={1.5}
              label={({ percent }) => `${((percent ?? 0) * 100).toFixed(0)}%`}
              labelLine={{ stroke: "#cbd5e1", strokeWidth: 1 }}
            >
              {issuesByStatus.map((entry, i) => (
                <Cell key={i} fill={STATUS_COLORS[entry.status] || "#94a3b8"} />
              ))}
            </Pie>
            <Tooltip contentStyle={tooltipStyle} />
            <Legend
              wrapperStyle={{ fontSize: "11px", fontWeight: 600 }}
              iconType="circle"
              iconSize={8}
            />
          </PieChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title={`Sự Cố Phát Sinh (${issuesByDay.length} ngày)`} color="#3b82f6">
        <ResponsiveContainer>
          <LineChart data={issuesByDay}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="date" fontSize={10} tick={{ fill: "#94a3b8" }} />
            <YAxis allowDecimals={false} fontSize={10} tick={{ fill: "#94a3b8" }} />
            <Tooltip contentStyle={tooltipStyle} />
            <Line
              type="monotone"
              dataKey="count"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={{ r: 3, fill: "#3b82f6", strokeWidth: 0 }}
              name="Số sự cố"
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Sự Cố Theo Khu Vực / Phân Xưởng" color="#8b5cf6" wide>
        {issuesByArea.length === 0 ? (
          <div className="flex h-full items-center justify-center text-xs text-slate-400">
            Chưa có dữ liệu
          </div>
        ) : (
          <ResponsiveContainer>
            <BarChart data={issuesByArea} layout="vertical" margin={{ left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis type="number" allowDecimals={false} fontSize={10} tick={{ fill: "#94a3b8" }} />
              <YAxis type="category" dataKey="area" width={130} fontSize={10} tick={{ fill: "#64748b", fontWeight: 600 }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="count" name="Số sự cố" radius={[0, 6, 6, 0]}>
                {issuesByArea.map((_, i) => (
                  <Cell key={i} fill="#8b5cf6" fillOpacity={1 - i * 0.08} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartCard>
    </div>
  );
}
