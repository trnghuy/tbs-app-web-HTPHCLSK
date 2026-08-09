"use client";

import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from "recharts";
import { ArrowRight } from "lucide-react";

interface WorkflowWaterfallProps {
  issues: any[];
}

export function WorkflowWaterfall({ issues }: WorkflowWaterfallProps) {
  const stages = [
    { key: "REPORTED", label: "1. Báo Cáo", color: "#FFB800", icon: "📋" },
    { key: "INVESTIGATING", label: "2. Điều Tra", color: "#78716C", icon: "🔍" },
    { key: "ROOT_CAUSE_FOUND", label: "3. Chốt Nguyên Nhân", color: "#0D7A47", icon: "✓" },
    { key: "ASSIGNED", label: "4. Giao Việc", color: "#005A36", icon: "📝" },
    { key: "IN_PROGRESS", label: "5. Sửa Chữa", color: "#0D7A47", icon: "⚙️" },
    { key: "DONE", label: "6. Hoàn Thành", color: "#005A36", icon: "✅" },
  ];

  const data = useMemo(() => {
    return stages.map((stage) => {
      const count = issues.filter(i => i.status === stage.key).length;
      return {
        name: stage.label,
        value: count,
        color: stage.color,
        icon: stage.icon,
        percent: issues.length > 0 ? Math.round((count / issues.length) * 100) : 0,
      };
    });
  }, [issues]);

  // Calculate flow percentages (how many move to next stage)
  const flowData = useMemo(() => {
    const flow = [];
    for (let i = 0; i < stages.length - 1; i++) {
      const current = issues.filter(is => is.status === stages[i].key).length;
      const next = issues.filter(is => is.status === stages[i + 1].key).length;
      const dropoff = current - next;
      flow.push({
        from: stages[i].label,
        to: stages[i + 1].label,
        current,
        next,
        dropoff,
        retention: current > 0 ? Math.round((next / current) * 100) : 0,
      });
    }
    return flow;
  }, [issues]);

  return (
    <div className="space-y-6">
      {/* Main Waterfall Chart */}
      <div className="rounded-2xl border border-warm-200 bg-white p-6">
        <h3 className="text-sm font-bold text-factory-dark mb-4">8-Bước Workflow Pipeline</h3>
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E8E4DE" />
            <XAxis 
              dataKey="name" 
              angle={-45} 
              textAnchor="end" 
              height={100}
              tick={{ fontSize: 11 }}
            />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip
              contentStyle={{ backgroundColor: "#fff", border: "1px solid #E8E4DE" }}
              formatter={(value, name, props) => {
                const percent = props.payload.percent;
                return [`${value} phiếu (${percent}%)`, "Số lượng"];
              }}
            />
            <Bar dataKey="value" radius={[8, 8, 0, 0]} animationDuration={800}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Flow Analysis */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {flowData.map((flow, idx) => (
          <div key={idx} className="rounded-2xl border border-warm-200 bg-white p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs font-bold text-warm-600">
                {flow.from} → {flow.to}
              </div>
              <span className="text-xs font-bold px-2 py-1 rounded-lg bg-signal-warning/10 text-signal-warning">
                {flow.retention}% chuyển tiếp
              </span>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-warm-700">Từ bước trước:</span>
                <span className="font-bold text-factory-dark">{flow.current} phiếu</span>
              </div>
              <div className="w-full h-2 rounded-full bg-warm-100 overflow-hidden">
                <div 
                  className="h-full rounded-full bg-signal-safe transition-all"
                  style={{ width: `${flow.retention}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-warm-700">Chuyển sang bước sau:</span>
                <span className="font-bold text-signal-safe">{flow.next} phiếu</span>
              </div>
              {flow.dropoff > 0 && (
                <div className="text-xs text-signal-warning font-semibold">
                  ⚠️ Rơi: {flow.dropoff} phiếu ({Math.round((flow.dropoff / flow.current) * 100)}%)
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Stage Summary */}
      <div className="rounded-2xl border border-warm-200 bg-white p-6">
        <h3 className="text-sm font-bold text-factory-dark mb-4">Tóm Tắt Các Bước</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {data.map((stage, idx) => (
            <div key={idx} className="p-3 rounded-xl border border-warm-100 bg-warm-50/50">
              <div className="flex items-start justify-between mb-2">
                <div className="text-2xl">{stage.icon}</div>
                <span className="text-xs font-bold px-2 py-1 rounded" style={{ backgroundColor: `${stage.color}20`, color: stage.color }}>
                  {stage.percent}%
                </span>
              </div>
              <div className="text-xs font-bold text-factory-dark truncate">{stage.name}</div>
              <div className="text-lg font-black text-factory-dark mt-1">{stage.value}</div>
              <div className="text-xs text-warm-600 mt-1">phiếu đang ở bước này</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
