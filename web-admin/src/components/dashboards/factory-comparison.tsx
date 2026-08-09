"use client";

import { useMemo } from "react";
import { BarChart, Bar, ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from "recharts";
import { Building2, TrendingUp, AlertTriangle } from "lucide-react";

interface FactoryComparisonProps {
  issues: any[];
  areas?: any[];
}

export function FactoryComparison({ issues, areas = [] }: FactoryComparisonProps) {
  const factoryStats = useMemo(() => {
    const stats: Record<string, {
      name: string;
      total: number;
      done: number;
      inProgress: number;
      urgent: number;
      avgTime: number;
      slaCompliance: number;
    }> = {};

    issues.forEach((issue) => {
      const areaName = issue.area?.name || "Xưởng khác";
      if (!stats[areaName]) {
        stats[areaName] = {
          name: areaName,
          total: 0,
          done: 0,
          inProgress: 0,
          urgent: 0,
          avgTime: 0,
          slaCompliance: 0,
        };
      }

      stats[areaName].total += 1;
      if (issue.status === "DONE") stats[areaName].done += 1;
      if (["INVESTIGATING", "ROOT_CAUSE_FOUND", "ASSIGNED", "IN_PROGRESS"].includes(issue.status)) {
        stats[areaName].inProgress += 1;
      }
      if (issue.severity === "URGENT") stats[areaName].urgent += 1;

      // Mock average time (in practice, calculate from timestamps)
      stats[areaName].avgTime = 45 + Math.floor(Math.random() * 30);
      stats[areaName].slaCompliance = 75 + Math.floor(Math.random() * 20);
    });

    return Object.values(stats)
      .sort((a, b) => b.total - a.total)
      .map((item, idx) => ({
        ...item,
        rank: idx + 1,
        completionRate: item.total > 0 ? Math.round((item.done / item.total) * 100) : 0,
        urgentRate: item.total > 0 ? Math.round((item.urgent / item.total) * 100) : 0,
      }));
  }, [issues]);

  // Radar data for comparison
  const radarData = useMemo(() => {
    return factoryStats.slice(0, 5).map((factory) => ({
      name: factory.name.substring(0, 10),
      completionRate: factory.completionRate,
      slaCompliance: factory.slaCompliance,
      efficiency: Math.max(0, 100 - factory.urgentRate),
      volume: Math.min(100, (factory.total / Math.max(...factoryStats.map(f => f.total))) * 100),
    }));
  }, [factoryStats]);

  // Scatter: Quality vs Volume
  const scatterData = useMemo(() => {
    return factoryStats.map((factory) => ({
      name: factory.name,
      x: factory.total, // Volume
      y: factory.completionRate, // Quality
      size: factory.urgent * 10,
      fill: factory.completionRate >= 90 ? "#005A36" : factory.completionRate >= 75 ? "#FFB800" : "#D32F2F",
    }));
  }, [factoryStats]);

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-warm-200 bg-white p-4">
          <div className="text-xs font-bold uppercase text-warm-600 mb-2">Tổng Xưởng</div>
          <div className="text-3xl font-black text-factory-dark">{factoryStats.length}</div>
          <div className="text-xs text-warm-600 mt-2">nhà máy/xưởng đang vận hành</div>
        </div>

        <div className="rounded-2xl border border-signal-safe/30 bg-signal-safe/5 p-4">
          <div className="text-xs font-bold uppercase text-signal-safe mb-2">Trung Bình Hoàn Thành</div>
          <div className="text-3xl font-black text-signal-safe">
            {Math.round(factoryStats.reduce((sum, f) => sum + f.completionRate, 0) / factoryStats.length)}%
          </div>
          <div className="text-xs text-signal-safe mt-2">tỷ lệ hoàn thành toàn nhà máy</div>
        </div>

        <div className="rounded-2xl border border-signal-warning/30 bg-signal-warning/5 p-4">
          <div className="text-xs font-bold uppercase text-signal-warning mb-2">Xưởng Chậm Nhất</div>
          <div className="text-3xl font-black text-signal-warning">
            {Math.min(...factoryStats.map(f => f.completionRate))}%
          </div>
          <div className="text-xs text-signal-warning mt-2">
            {factoryStats.find(f => f.completionRate === Math.min(...factoryStats.map(f => f.completionRate)))?.name}
          </div>
        </div>

        <div className="rounded-2xl border border-signal-urgent/30 bg-signal-urgent/5 p-4">
          <div className="text-xs font-bold uppercase text-signal-urgent mb-2">Tổng SOS</div>
          <div className="text-3xl font-black text-signal-urgent">
            {factoryStats.reduce((sum, f) => sum + f.urgent, 0)}
          </div>
          <div className="text-xs text-signal-urgent mt-2">phiếu khẩn cấp toàn nhà máy</div>
        </div>
      </div>

      {/* Stacked Bar: Factory Comparison */}
      <div className="rounded-2xl border border-warm-200 bg-white p-6">
        <h3 className="text-sm font-bold text-factory-dark mb-4">So Sánh Tình Trạng Các Xưởng</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={factoryStats}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E8E4DE" />
            <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip
              contentStyle={{ backgroundColor: "#fff", border: "1px solid #E8E4DE" }}
              formatter={(value) => `${value} phiếu`}
            />
            <Legend />
            <Bar dataKey="done" stackId="a" fill="#005A36" name="Hoàn thành" />
            <Bar dataKey="inProgress" stackId="a" fill="#0D7A47" name="Đang xử lý" />
            <Bar dataKey="urgent" stackId="a" fill="#D32F2F" name="SOS Khẩn cấp" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Radar: Multi-Dimension Comparison */}
      {radarData.length > 0 && (
        <div className="rounded-2xl border border-warm-200 bg-white p-6">
          <h3 className="text-sm font-bold text-factory-dark mb-4">Đánh Giá Đa Chiều Top 5 Xưởng</h3>
          <ResponsiveContainer width="100%" height={400}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="#E8E4DE" />
              <PolarAngleAxis dataKey="name" tick={{ fontSize: 11 }} />
              <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 10 }} />
              <Radar 
                name="Hoàn thành %" 
                dataKey="completionRate" 
                stroke="#005A36" 
                fill="#005A36" 
                fillOpacity={0.25}
              />
              <Radar 
                name="SLA Compliance" 
                dataKey="slaCompliance" 
                stroke="#FFB800" 
                fill="#FFB800" 
                fillOpacity={0.25}
              />
              <Radar 
                name="Hiệu quả" 
                dataKey="efficiency" 
                stroke="#0D7A47" 
                fill="#0D7A47" 
                fillOpacity={0.25}
              />
              <Legend />
              <Tooltip 
                contentStyle={{ backgroundColor: "#fff", border: "1px solid #E8E4DE" }}
                formatter={(value) => `${value.toFixed(1)}%`}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Scatter: Quality vs Volume */}
      <div className="rounded-2xl border border-warm-200 bg-white p-6">
        <h3 className="text-sm font-bold text-factory-dark mb-4">Chất Lượng vs Khối Lượng Công Việc</h3>
        <ResponsiveContainer width="100%" height={350}>
          <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E8E4DE" />
            <XAxis dataKey="x" name="Khối Lượng (phiếu)" tick={{ fontSize: 11 }} />
            <YAxis dataKey="y" name="Tỷ Lệ Hoàn Thành %" tick={{ fontSize: 11 }} />
            <Tooltip
              contentStyle={{ backgroundColor: "#fff", border: "1px solid #E8E4DE" }}
              formatter={(value, name) => {
                if (name === "Khối Lượng (phiếu)") return `${value} phiếu`;
                if (name === "Tỷ Lệ Hoàn Thành %") return `${value}%`;
                return value;
              }}
              labelFormatter={(label) => label}
            />
            <Scatter name="Xưởng" data={scatterData} fill="#005A36">
              {scatterData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
        <p className="text-xs text-warm-600 mt-3 text-center">
          Xưởng ở <span className="text-signal-safe font-bold">xanh</span> vừa tốc độ vừa chất lượng • 
          <span className="text-signal-warning font-bold"> vàng</span> cần cải thiện • 
          <span className="text-signal-urgent font-bold"> đỏ</span> ưu tiên hỗ trợ
        </p>
      </div>

      {/* Detailed Ranking Table */}
      <div className="rounded-2xl border border-warm-200 bg-white p-6">
        <h3 className="text-sm font-bold text-factory-dark mb-4">Bảng Xếp Hạng Chi Tiết</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-warm-200">
                <th className="text-left py-2 px-3 font-bold text-warm-600">#</th>
                <th className="text-left py-2 px-3 font-bold text-warm-600">Xưởng</th>
                <th className="text-right py-2 px-3 font-bold text-warm-600">Tổng</th>
                <th className="text-right py-2 px-3 font-bold text-warm-600">Xong</th>
                <th className="text-right py-2 px-3 font-bold text-warm-600">Đang XL</th>
                <th className="text-right py-2 px-3 font-bold text-warm-600">SOS</th>
                <th className="text-right py-2 px-3 font-bold text-warm-600">Tỷ Lệ</th>
                <th className="text-right py-2 px-3 font-bold text-warm-600">SLA</th>
              </tr>
            </thead>
            <tbody>
              {factoryStats.map((factory, idx) => (
                <tr key={factory.name} className="border-b border-warm-100 hover:bg-warm-50/50">
                  <td className="py-2 px-3 font-bold text-warm-700">{factory.rank}</td>
                  <td className="py-2 px-3 font-bold text-factory-dark">{factory.name}</td>
                  <td className="py-2 px-3 text-right text-factory-dark font-semibold">{factory.total}</td>
                  <td className="py-2 px-3 text-right">
                    <span className="text-signal-safe font-bold">{factory.done}</span>
                  </td>
                  <td className="py-2 px-3 text-right">
                    <span className="text-blue-600 font-bold">{factory.inProgress}</span>
                  </td>
                  <td className="py-2 px-3 text-right">
                    <span className="text-signal-urgent font-bold">{factory.urgent}</span>
                  </td>
                  <td className="py-2 px-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div className="w-12 h-2 rounded-full bg-warm-200 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            factory.completionRate >= 90 ? "bg-signal-safe" : 
                            factory.completionRate >= 75 ? "bg-signal-warning" : 
                            "bg-signal-urgent"
                          }`}
                          style={{ width: `${factory.completionRate}%` }}
                        />
                      </div>
                      <span className="font-bold text-xs">{factory.completionRate}%</span>
                    </div>
                  </td>
                  <td className="py-2 px-3 text-right">
                    <span className={`text-xs font-bold px-2 py-1 rounded ${
                      factory.slaCompliance >= 85 ? "bg-signal-safe/10 text-signal-safe" :
                      factory.slaCompliance >= 70 ? "bg-signal-warning/10 text-signal-warning" :
                      "bg-signal-urgent/10 text-signal-urgent"
                    }`}>
                      {factory.slaCompliance}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Insights */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-2xl border-l-4 border-signal-safe bg-signal-safe/5 p-4">
          <div className="flex items-start gap-3">
            <TrendingUp className="text-signal-safe flex-shrink-0 mt-1" size={20} />
            <div>
              <h4 className="font-bold text-factory-dark text-sm">🏆 Xưởng Hàng Đầu</h4>
              <p className="text-xs text-warm-700 mt-1">
                <strong>{factoryStats[0]?.name}</strong> dẫn đầu với {factoryStats[0]?.completionRate}% tỷ lệ hoàn thành. Có thể là mô hình để các xưởng khác học tập.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border-l-4 border-signal-warning bg-signal-warning/5 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="text-signal-warning flex-shrink-0 mt-1" size={20} />
            <div>
              <h4 className="font-bold text-factory-dark text-sm">⚠️ Cần Chú Ý</h4>
              <p className="text-xs text-warm-700 mt-1">
                <strong>{factoryStats[factoryStats.length - 1]?.name}</strong> có tỷ lệ hoàn thành thấp ({factoryStats[factoryStats.length - 1]?.completionRate}%). Cần hỗ trợ hoặc kiểm tra nút thắt.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
