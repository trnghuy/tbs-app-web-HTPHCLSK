"use client";

import { useMemo } from "react";
import { PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ComposedChart, Bar } from "recharts";
import { TrendingUp, TrendingDown } from "lucide-react";

interface KPIDonutTrendProps {
  issues: any[];
  monthlyData?: Array<{ month: string; total: number; done: number; inProgress: number }>;
}

export function KPIDonutTrend({ issues, monthlyData }: KPIDonutTrendProps) {
  const stats = useMemo(() => {
    const total = issues.length;
    const done = issues.filter(i => i.status === "DONE").length;
    const inProgress = issues.filter(i => 
      ["INVESTIGATING", "ROOT_CAUSE_FOUND", "ASSIGNED", "IN_PROGRESS"].includes(i.status)
    ).length;
    const reported = issues.filter(i => i.status === "REPORTED").length;
    const urgent = issues.filter(i => i.severity === "URGENT").length;

    return { total, done, inProgress, reported, urgent };
  }, [issues]);

  // Default mock monthly data if not provided
  const chartData = monthlyData || [
    { month: "Tháng 1", total: 120, done: 95, inProgress: 25 },
    { month: "Tháng 2", total: 135, done: 108, inProgress: 27 },
    { month: "Tháng 3", total: 128, done: 102, inProgress: 26 },
    { month: "Tháng 4", total: 150, done: 118, inProgress: 32 },
    { month: "Tháng 5", total: 142, done: 113, inProgress: 29 },
    { month: "Tháng 6", total: 147, done: 116, inProgress: 31 },
  ];

  const donutData = [
    { name: "Hoàn thành", value: stats.done, color: "#005A36" },
    { name: "Đang xử lý", value: stats.inProgress, color: "#0D7A47" },
    { name: "Báo cáo mới", value: stats.reported, color: "#FFB800" },
    { name: "SOS Khẩn cấp", value: stats.urgent, color: "#D32F2F" },
  ];

  const trend = chartData.length >= 2 
    ? Math.round(((chartData[chartData.length - 1].total - chartData[0].total) / chartData[0].total) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* KPI Cards Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-warm-200 bg-white p-4">
          <div className="text-xs font-bold uppercase text-warm-600 mb-2">Tổng Sự Cố</div>
          <div className="text-3xl font-black text-factory-dark">{stats.total}</div>
          <div className="text-xs text-warm-500 mt-2">
            {trend > 0 ? (
              <span className="flex items-center gap-1 text-signal-warning">
                <TrendingUp size={14} /> +{trend}% vs tháng trước
              </span>
            ) : (
              <span className="flex items-center gap-1 text-signal-safe">
                <TrendingDown size={14} /> {trend}% vs tháng trước
              </span>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-green-200 bg-green-50/50 p-4">
          <div className="text-xs font-bold uppercase text-green-700 mb-2">Hoàn Thành</div>
          <div className="text-3xl font-black text-signal-safe">{stats.done}</div>
          <div className="text-xs text-green-600 mt-2">
            {stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0}% tỷ lệ
          </div>
        </div>

        <div className="rounded-2xl border border-blue-200 bg-blue-50/50 p-4">
          <div className="text-xs font-bold uppercase text-blue-700 mb-2">Đang Xử Lý</div>
          <div className="text-3xl font-black text-blue-600">{stats.inProgress}</div>
          <div className="text-xs text-blue-600 mt-2">
            {stats.total > 0 ? Math.round((stats.inProgress / stats.total) * 100) : 0}% trong tiến trình
          </div>
        </div>

        <div className="rounded-2xl border border-red-200 bg-red-50/50 p-4">
          <div className="text-xs font-bold uppercase text-red-700 mb-2">SOS Urgent</div>
          <div className="text-3xl font-black text-signal-urgent">{stats.urgent}</div>
          <div className="text-xs text-red-600 mt-2">
            {stats.total > 0 ? Math.round((stats.urgent / stats.total) * 100) : 0}% khẩn cấp
          </div>
        </div>
      </div>

      {/* Donut + Trend Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Donut Chart */}
        <div className="lg:col-span-2 rounded-2xl border border-warm-200 bg-white p-6">
          <h3 className="text-sm font-bold text-factory-dark mb-4">Phân Bố Trạng Thái</h3>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={donutData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={2}
                dataKey="value"
              >
                {donutData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value) => `${value} vụ`}
                contentStyle={{ backgroundColor: "#fff", border: "1px solid #E8E4DE" }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-4 space-y-2">
            {donutData.map((item) => (
              <div key={item.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-warm-700">{item.name}</span>
                </div>
                <span className="font-bold text-factory-dark">{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Trend Chart */}
        <div className="lg:col-span-3 rounded-2xl border border-warm-200 bg-white p-6">
          <h3 className="text-sm font-bold text-factory-dark mb-4">Xu Hướng 6 Tháng Qua</h3>
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E8E4DE" />
              <XAxis dataKey="month" angle={-45} textAnchor="end" height={80} tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip 
                contentStyle={{ backgroundColor: "#fff", border: "1px solid #E8E4DE" }}
                formatter={(value) => `${value} vụ`}
              />
              <Legend />
              <Bar dataKey="done" fill="#005A36" name="Hoàn thành" radius={[4, 4, 0, 0]} />
              <Bar dataKey="inProgress" fill="#0D7A47" name="Đang xử lý" radius={[4, 4, 0, 0]} />
              <Line 
                type="monotone" 
                dataKey="total" 
                stroke="#FFB800" 
                name="Tổng cộng"
                strokeWidth={3}
                dot={{ fill: "#FFB800", r: 5 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
