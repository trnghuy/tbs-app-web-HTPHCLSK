"use client";

import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from "recharts";
import { TrendingUp, AlertTriangle } from "lucide-react";

interface TopDefectsBarProps {
  issues: any[];
  topN?: number;
}

export function TopDefectsBar({ issues, topN = 12 }: TopDefectsBarProps) {
  const data = useMemo(() => {
    const defectMap: Record<string, { name: string; count: number; urgent: number; critical: boolean }> = {};

    issues.forEach((issue) => {
      const defectName = issue.failureCategory?.name || "Khác";
      if (!defectMap[defectName]) {
        defectMap[defectName] = { name: defectName, count: 0, urgent: 0, critical: false };
      }
      defectMap[defectName].count += 1;
      if (issue.severity === "URGENT") {
        defectMap[defectName].urgent += 1;
      }
    });

    return Object.values(defectMap)
      .sort((a, b) => b.count - a.count)
      .slice(0, topN)
      .map((item, idx) => ({
        ...item,
        rank: idx + 1,
        color: idx === 0 ? "#D32F2F" : idx === 1 ? "#FF7043" : idx === 2 ? "#FFB800" : "#0D7A47",
      }));
  }, [issues, topN]);

  const totalDefects = issues.length;
  const top5Total = data.slice(0, 5).reduce((sum, d) => sum + d.count, 0);
  const paretoPercent = totalDefects > 0 ? Math.round((top5Total / totalDefects) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Pareto Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-warm-200 bg-white p-4">
          <div className="text-xs font-bold uppercase text-warm-600 mb-2">Top Lỗi</div>
          <div className="text-3xl font-black text-factory-dark">{data.length}</div>
          <div className="text-xs text-warm-600 mt-2">loại lỗi được theo dõi</div>
        </div>

        <div className="rounded-2xl border border-signal-warning/30 bg-signal-warning/5 p-4">
          <div className="text-xs font-bold uppercase text-signal-warning mb-2">Pareto 80/20</div>
          <div className="text-3xl font-black text-signal-warning">{paretoPercent}%</div>
          <div className="text-xs text-signal-warning mt-2">Top 5 lỗi chiếm {top5Total} vụ</div>
        </div>

        <div className="rounded-2xl border border-signal-urgent/30 bg-signal-urgent/5 p-4">
          <div className="text-xs font-bold uppercase text-signal-urgent mb-2">SOS Defect</div>
          <div className="text-3xl font-black text-signal-urgent">
            {data.reduce((sum, d) => sum + d.urgent, 0)}
          </div>
          <div className="text-xs text-signal-urgent mt-2">lỗi khẩn cấp trong top</div>
        </div>
      </div>

      {/* Horizontal Bar Chart */}
      <div className="rounded-2xl border border-warm-200 bg-white p-6">
        <h3 className="text-sm font-bold text-factory-dark mb-4">Top {topN} Loại Lỗi (Pareto 80/20)</h3>
        <ResponsiveContainer width="100%" height={Math.max(300, data.length * 30)}>
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 200 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#E8E4DE" />
            <XAxis type="number" tick={{ fontSize: 11 }} />
            <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={190} />
            <Tooltip
              contentStyle={{ backgroundColor: "#fff", border: "1px solid #E8E4DE" }}
              formatter={(value, name) => {
                if (name === "count") return [`${value} vụ`, "Tổng"];
                return [`${value} vụ SOS`, "Khẩn cấp"];
              }}
            />
            <Legend />
            <Bar dataKey="count" fill="#005A36" name="Tổng vụ" radius={[0, 8, 8, 0]} />
            {data.some(d => d.urgent > 0) && (
              <Bar dataKey="urgent" fill="#D32F2F" name="SOS" radius={[0, 8, 8, 0]} />
            )}
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Detail List */}
      <div className="rounded-2xl border border-warm-200 bg-white p-6">
        <h3 className="text-sm font-bold text-factory-dark mb-4">Chi Tiết Từng Lỗi</h3>
        <div className="space-y-3">
          {data.map((defect) => {
            const percent = totalDefects > 0 ? Math.round((defect.count / totalDefects) * 100) : 0;
            return (
              <div key={defect.name} className="p-3 rounded-xl border border-warm-100 bg-warm-50/50">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black px-2 py-1 rounded-full bg-gray-200 text-gray-700 w-6 h-6 flex items-center justify-center">
                      {defect.rank}
                    </span>
                    <span className="font-bold text-factory-dark truncate">{defect.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold px-2 py-1 rounded-lg bg-blue-100 text-blue-700">
                      {defect.count} vụ
                    </span>
                    {defect.urgent > 0 && (
                      <span className="text-xs font-bold px-2 py-1 rounded-lg bg-signal-urgent/10 text-signal-urgent flex items-center gap-1">
                        <AlertTriangle size={12} /> {defect.urgent} SOS
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 rounded-full bg-warm-200 overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all"
                      style={{ 
                        width: `${percent}%`,
                        backgroundColor: defect.color 
                      }}
                    />
                  </div>
                  <span className="text-xs font-bold text-warm-600 w-10 text-right">{percent}%</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Pareto Insight */}
      <div className="rounded-2xl border-l-4 border-signal-warning bg-signal-warning/5 p-4">
        <div className="flex items-start gap-3">
          <TrendingUp className="text-signal-warning flex-shrink-0 mt-1" size={20} />
          <div>
            <h4 className="font-bold text-factory-dark text-sm">Pareto Insight</h4>
            <p className="text-xs text-warm-700 mt-1">
              Top 5 loại lỗi chiếm <strong className="text-signal-warning">{paretoPercent}%</strong> tổng sự cố. 
              Nên tập trung vào chặn 5 nguyên nhân chính để giảm 80% tổn thất chất lượng.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
