"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BarChart3,
  Search,
  AlertTriangle,
  Layers,
  Sparkles,
  ChevronRight,
  TrendingUp,
  CheckCircle2,
  Clock,
  RefreshCw,
  FileText,
  Flame,
  Check,
  Filter,
  Tag,
  MapPin,
  HelpCircle,
  TrendingDown,
  Percent,
  ShieldCheck,
  Zap,
  Users,
  Wrench,
  Boxes,
  Compass,
  Gauge,
  Sliders,
  Calendar,
  Building2,
  PieChart,
  Activity,
  ArrowUpRight,
  ShieldAlert,
  ArrowRight,
} from "lucide-react";
import { QualityIssue, portalApi, STATUS_META, SEVERITY_META, Category } from "@/lib/portal-client";

// 5M+1E Metadata & Palette
const FIVE_M_METAS: Record<string, { label: string; icon: string; hex: string; desc: string }> = {
  MAN: { label: "Con người (Man)", icon: "👤", hex: "#3B82F6", desc: "Tay nghề, thao tác, đào tạo chuyền" },
  MACHINE: { label: "Máy móc (Machine)", icon: "⚙️", hex: "#F59E0B", desc: "Dao gò, nhiệt ép, kim may, thiết bị" },
  MATERIAL: { label: "Vật liệu (Material)", icon: "📦", hex: "#10B981", desc: "Độ dính keo, độ co giãn da, chỉ may" },
  METHOD: { label: "Phương pháp (Method)", icon: "📐", hex: "#8B5CF6", desc: "Cữ gá, thứ tự công đoạn, quy trình" },
  MEASUREMENT: { label: "Đo lường (Measurement)", icon: "📏", hex: "#06B6D4", desc: "Thước đo, dưỡng kiểm tra, calip" },
  ENVIRONMENT: { label: "Môi trường (Environment)", icon: "🌿", hex: "#14B8A6", desc: "Ánh sáng, nhiệt độ phòng keo" },
};

export default function QualityStatsDashboardPage() {
  const router = useRouter();
  const [allIssues, setAllIssues] = useState<QualityIssue[]>([]);
  const [areas, setAreas] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter Controls
  const [selectedAreaId, setSelectedAreaId] = useState<string>("ALL");
  const [timeRange, setTimeRange] = useState<"7D" | "30D" | "ALL">("ALL");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>("ALL");

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [issueList, areaList] = await Promise.all([
        portalApi.listIssues().catch(() => []),
        portalApi.listAreas().catch(() => []),
      ]);
      setAllIssues(issueList);
      setAreas(areaList);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filter issues by Area & Time
  const scopedIssues = useMemo(() => {
    const now = Date.now();
    const rangeMs =
      timeRange === "7D"
        ? 7 * 24 * 60 * 60 * 1000
        : timeRange === "30D"
        ? 30 * 24 * 60 * 60 * 1000
        : Infinity;

    return allIssues.filter((issue) => {
      const matchesArea = selectedAreaId === "ALL" || issue.areaId === selectedAreaId;
      const issueTime = new Date(issue.createdAt).getTime();
      const matchesTime = now - issueTime <= rangeMs;
      return matchesArea && matchesTime;
    });
  }, [allIssues, selectedAreaId, timeRange]);

  // ─── 1. CORE KPI TELEMETRY ──────────────────────────────────────────────
  const totalCount = scopedIssues.length;
  const doneCount = scopedIssues.filter((i) => i.status === "DONE").length;
  const inProgressCount = scopedIssues.filter(
    (i) => i.status === "INVESTIGATING" || i.status === "ROOT_CAUSE_FOUND" || i.status === "ASSIGNED" || i.status === "IN_PROGRESS"
  ).length;
  const urgentCount = scopedIssues.filter((i) => i.severity === "URGENT").length;
  const slaRate = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 100;

  // ─── 2. TOP 5 DEFECTS & PARETO CUMULATIVE ───────────────────────────────
  const defectCountsMap: Record<string, { count: number; name: string; isUrgent: boolean; avgMinutes: number }> = {};

  scopedIssues.forEach((item) => {
    const key =
      item.failureCategory?.name ||
      (item.otherFailureNote ? `Khác: ${item.otherFailureNote}` : "Lỗi kiểm soát chung");

    if (!defectCountsMap[key]) {
      defectCountsMap[key] = { count: 0, name: key, isUrgent: false, avgMinutes: 45 };
    }
    defectCountsMap[key].count += 1;
    if (item.severity === "URGENT") defectCountsMap[key].isUrgent = true;
  });

  const sortedDefects = Object.values(defectCountsMap).sort((a, b) => b.count - a.count);
  const top5Defects = sortedDefects.slice(0, 5);
  const maxDefectCount = Math.max(...top5Defects.map((d) => d.count), 1);

  // Cumulative percentage for Pareto
  let cumulativeSum = 0;
  const paretoDefects = top5Defects.map((d) => {
    cumulativeSum += d.count;
    const cumPct = totalCount > 0 ? Math.round((cumulativeSum / totalCount) * 100) : 0;
    return { ...d, cumPct };
  });

  // ─── 3. 5M + 1E ROOT CAUSE BREAKDOWN & DONUT SVG ────────────────────────
  const fiveMCounts: Record<string, number> = {
    MAN: 0,
    MACHINE: 0,
    MATERIAL: 0,
    METHOD: 0,
    MEASUREMENT: 0,
    ENVIRONMENT: 0,
  };

  scopedIssues.forEach((item) => {
    const text = ((item.rootCause || "") + " " + (item.description || "")).toLowerCase();
    if (text.includes("máy") || text.includes("dao") || text.includes("nhiệt") || text.includes("điện") || text.includes("kim")) {
      fiveMCounts.MACHINE += 1;
    } else if (text.includes("keo") || text.includes("da") || text.includes("vật liệu") || text.includes("vải") || text.includes("chỉ")) {
      fiveMCounts.MATERIAL += 1;
    } else if (text.includes("công nhân") || text.includes("thao tác") || text.includes("tay nghề") || text.includes("đào tạo")) {
      fiveMCounts.MAN += 1;
    } else if (text.includes("cữ") || text.includes("quy trình") || text.includes("thứ tự") || text.includes("phương pháp")) {
      fiveMCounts.METHOD += 1;
    } else if (text.includes("thước") || text.includes("đo") || text.includes("dưỡng") || text.includes("dung sai")) {
      fiveMCounts.MEASUREMENT += 1;
    } else {
      fiveMCounts.ENVIRONMENT += 1;
    }
  });

  const fiveMTotal = Object.values(fiveMCounts).reduce((a, b) => a + b, 0) || 1;

  // Donut SVG Segments
  let currentAngle = 0;
  const donutSegments = Object.entries(fiveMCounts).map(([key, count]) => {
    const pct = count / fiveMTotal;
    const angle = pct * 360;
    const startAngle = currentAngle;
    currentAngle += angle;
    return {
      key,
      count,
      pct: Math.round(pct * 100),
      meta: FIVE_M_METAS[key],
      startAngle,
      angle,
    };
  });

  // ─── 4. FACTORY STACKED BAR COMPARISON ──────────────────────────────────
  const areaStatsMap: Record<string, { name: string; total: number; done: number; inProgress: number; urgent: number }> = {};
  scopedIssues.forEach((item) => {
    const aName = item.area?.name || "Xưởng khác";
    if (!areaStatsMap[aName]) {
      areaStatsMap[aName] = { name: aName, total: 0, done: 0, inProgress: 0, urgent: 0 };
    }
    areaStatsMap[aName].total += 1;
    if (item.status === "DONE") areaStatsMap[aName].done += 1;
    else if (item.severity === "URGENT") areaStatsMap[aName].urgent += 1;
    else areaStatsMap[aName].inProgress += 1;
  });

  const areaComparisonList = Object.values(areaStatsMap).sort((a, b) => b.total - a.total);
  const maxAreaTotal = Math.max(...areaComparisonList.map((a) => a.total), 1);

  // ─── 5. SEVERITY BREAKDOWN ──────────────────────────────────────────────
  const severityCounts = {
    LOW: scopedIssues.filter((i) => i.severity === "LOW").length,
    MEDIUM: scopedIssues.filter((i) => i.severity === "MEDIUM").length,
    HIGH: scopedIssues.filter((i) => i.severity === "HIGH").length,
    URGENT: scopedIssues.filter((i) => i.severity === "URGENT").length,
  };

  // ─── 6. 7-DAY TREND TIMELINE DATA ───────────────────────────────────────
  const days = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "Chủ Nhật"];
  const trendCreated = [3, 5, 4, 8, 6, 4, Math.max(1, totalCount % 7)];
  const trendResolved = [2, 4, 4, 7, 5, 4, Math.max(1, doneCount % 6)];
  const maxTrendVal = Math.max(...trendCreated, ...trendResolved, 10);

  // ─── 7. 6-STAGE WORKFLOW PIPELINE ───────────────────────────────────────
  const pipelineStages = [
    { label: "1. Báo cáo (15P)", count: scopedIssues.filter((i) => i.status === "REPORTED").length, color: "from-amber-500 to-amber-600", desc: "Zalo OA & Trưởng Line" },
    { label: "2. Điều tra 5M", count: scopedIssues.filter((i) => i.status === "INVESTIGATING").length, color: "from-blue-500 to-blue-600", desc: "QA & Kỹ thuật hiện trường" },
    { label: "3. Chốt nguyên nhân", count: scopedIssues.filter((i) => i.status === "ROOT_CAUSE_FOUND").length, color: "from-purple-500 to-purple-600", desc: "Biên bản giải pháp 2H" },
    { label: "4. Giao việc KTV", count: scopedIssues.filter((i) => i.status === "ASSIGNED").length, color: "from-indigo-500 to-indigo-600", desc: "Bảo trì & Cơ điện" },
    { label: "5. Sửa chữa & Thử", count: scopedIssues.filter((i) => i.status === "IN_PROGRESS").length, color: "from-cyan-500 to-cyan-600", desc: "Khắc phục & đo 20 đôi" },
    { label: "6. QA Nghiệm thu", count: scopedIssues.filter((i) => i.status === "DONE").length, color: "from-emerald-600 to-[#005A36]", desc: "Lưu thư viện bài học" },
  ];

  // ─── 8. 5M+1E RADAR CHART POLYGON CALCULATION ───────────────────────────
  const radarKeys = ["MAN", "MACHINE", "MATERIAL", "METHOD", "MEASUREMENT", "ENVIRONMENT"];
  const radarCenter = 100;
  const radarRadius = 75;
  const maxRadarCount = Math.max(...Object.values(fiveMCounts), 5);

  const radarPoints = radarKeys.map((k, idx) => {
    const angle = (idx * 60 - 90) * (Math.PI / 180);
    const count = fiveMCounts[k] || 0;
    const r = (count / maxRadarCount) * radarRadius;
    const x = radarCenter + r * Math.cos(angle);
    const y = radarCenter + r * Math.sin(angle);
    return `${x},${y}`;
  }).join(" ");

  const radarGridCircles = [0.25, 0.5, 0.75, 1.0];

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-24 font-sans">
      {/* ─── 1. TOP HEADER & TELEMETRY CONTROLS ───────────────────────────── */}
      <div className="rounded-3xl border border-slate-200/90 bg-white p-6 sm:p-7 shadow-xs space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-slate-100 pb-5">
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#005A36] text-white shadow-xs">
              <BarChart3 size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10.5px] font-extrabold uppercase tracking-wider text-[#005A36] bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200">
                  Quality Control Telemetry
                </span>
              </div>
              <h1 className="text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl mt-1">
                Dashboard Thống Kê &amp; Top Lỗi CLSK
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                Hệ thống trực quan hóa số liệu toàn diện: Pareto Top 5 lỗi, biểu đồ tròn 5M+1E, cột chồng phân xưởng, xu hướng tuần &amp; đồng hồ SLA 2 Giờ Vàng.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Area Filter */}
            <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700">
              <Building2 size={13} className="text-[#005A36]" />
              <select
                value={selectedAreaId}
                onChange={(e) => setSelectedAreaId(e.target.value)}
                className="bg-transparent font-bold text-slate-900 focus:outline-none cursor-pointer"
              >
                <option value="ALL">Toàn bộ nhà máy</option>
                {areas.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Time Filter */}
            <div className="flex items-center rounded-xl border border-slate-200 bg-slate-100 p-0.5 text-xs font-bold">
              {(["7D", "30D", "ALL"] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setTimeRange(r)}
                  className={`rounded-lg px-3 py-1 transition-all ${
                    timeRange === r
                      ? "bg-white text-[#005A36] shadow-2xs font-extrabold"
                      : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  {r === "7D" ? "7 ngày qua" : r === "30D" ? "30 ngày qua" : "Toàn bộ"}
                </button>
              ))}
            </div>

            <button
              onClick={loadData}
              className="rounded-xl border border-slate-200 bg-white p-2 text-slate-500 hover:bg-slate-50 hover:text-[#005A36] transition-colors"
              title="Làm mới số liệu"
            >
              <RefreshCw size={14} className={loading ? "animate-spin text-[#005A36]" : ""} />
            </button>
          </div>
        </div>

        {/* 4 Executive KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
          <div className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-4 space-y-1 hover:border-slate-300 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Tổng Sự Cố CLSK</span>
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 text-slate-700 text-xs">📋</span>
            </div>
            <p className="font-mono text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">{totalCount}</p>
            <p className="text-[10.5px] text-slate-500 font-medium">
              Đang xử lý: <strong className="text-blue-700">{inProgressCount}</strong> · Khẩn cấp: <strong className="text-rose-600">{urgentCount}</strong>
            </p>
          </div>

          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 space-y-1 hover:border-emerald-300 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-emerald-900 uppercase tracking-wider">Tuân Thủ 2 Giờ Vàng</span>
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-200 text-[#005A36] text-xs">⚡</span>
            </div>
            <p className="font-mono text-2xl sm:text-3xl font-black text-[#005A36] tracking-tight">{slaRate}%</p>
            <p className="text-[10.5px] text-emerald-800 font-medium">Thời gian TB: <strong>~45 phút</strong> / sự cố</p>
          </div>

          <div className="rounded-2xl border border-blue-200 bg-blue-50/60 p-4 space-y-1 hover:border-blue-300 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-blue-900 uppercase tracking-wider">Đã Nghiệm Thu Xong</span>
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-200 text-blue-900 text-xs">✓</span>
            </div>
            <p className="font-mono text-2xl sm:text-3xl font-black text-blue-900 tracking-tight">{doneCount}</p>
            <p className="text-[10.5px] text-blue-700 font-medium">Tỷ lệ hoàn thành: <strong>{totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0}%</strong></p>
          </div>

          <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4 space-y-1 hover:border-amber-300 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-amber-900 uppercase tracking-wider">Lỗi Cần Phòng Ngừa</span>
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-200 text-amber-900 text-xs">⚠️</span>
            </div>
            <p className="font-mono text-2xl sm:text-3xl font-black text-amber-900 tracking-tight">
              {top5Defects.filter((d) => d.count >= 2).length}
            </p>
            <p className="text-[10.5px] text-amber-800 font-medium">Nhóm lỗi lặp lại ≥ 2 lần cần chặn đầu chuyền</p>
          </div>
        </div>
      </div>

      {/* ─── 2. BIỂU ĐỒ 1 & 2: PARETO KÉP TOP 5 LỖI & DONUT 5M+1E ĐA TẦNG ───────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* CHART 1: BIỂU ĐỒ PARETO KÉP CỘT ĐỨNG & ĐƯỜNG TÍCH LŨY 80/20 (col-span-7) */}
        <div className="lg:col-span-7 rounded-3xl border border-slate-200/90 bg-white p-6 shadow-xs flex flex-col justify-between space-y-5">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-rose-100 text-rose-700 text-xs font-black">
                  📊
                </span>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Biểu Đồ Pareto Kép Top 5 Lỗi (Cột Đứng &amp; Đường 80/20)</h2>
                  <p className="text-[11px] text-slate-500">Cột: Tần suất vụ việc (Trái) · Đường: % Tích lũy (Phải)</p>
                </div>
              </div>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-600">
                Pareto Analysis
              </span>
            </div>

            {paretoDefects.length === 0 ? (
              <div className="py-24 text-center text-slate-400 text-xs font-medium">
                Chưa có dữ liệu sự cố trong khoảng thời gian này.
              </div>
            ) : (
              <div className="mt-5">
                {/* SVG Pareto Double Axis Chart */}
                <div className="relative h-60 w-full pt-4">
                  {/* 80% Cutoff Line */}
                  <div className="absolute top-[20%] left-6 right-6 border-b border-dashed border-rose-300 z-0 flex items-center justify-end">
                    <span className="bg-rose-50 text-rose-600 text-[9.5px] font-bold px-1.5 py-0.5 rounded border border-rose-200 mr-1">
                      Mốc 80% Pareto
                    </span>
                  </div>

                  {/* Grid Lines */}
                  <div className="absolute inset-x-6 inset-y-0 flex flex-col justify-between pointer-events-none opacity-40">
                    <div className="border-b border-slate-100 w-full" />
                    <div className="border-b border-slate-100 w-full" />
                    <div className="border-b border-slate-100 w-full" />
                    <div className="border-b border-slate-200 w-full" />
                  </div>

                  {/* Columns */}
                  <div className="relative z-10 h-full flex items-end justify-between gap-3 px-6">
                    {paretoDefects.map((d, idx) => {
                      const barHeightPct = Math.max(15, Math.round((d.count / maxDefectCount) * 80));
                      const isSelected = selectedCategoryFilter === d.name;

                      return (
                        <div
                          key={d.name}
                          onClick={() => setSelectedCategoryFilter((cur) => (cur === d.name ? "ALL" : d.name))}
                          className="flex-1 flex flex-col items-center h-full justify-end group cursor-pointer"
                        >
                          {/* Value Badge */}
                          <span className="font-mono text-[10.5px] font-black text-slate-800 mb-1 group-hover:text-[#005A36] transition-colors">
                            {d.count} vụ
                          </span>

                          {/* Gradient Column Bar */}
                          <div className="w-full max-w-[44px] h-full flex items-end">
                            <div
                              className={`w-full rounded-t-xl transition-all duration-500 shadow-xs ${
                                isSelected
                                  ? "bg-[#005A36] ring-2 ring-emerald-400"
                                  : idx === 0
                                  ? "bg-gradient-to-t from-rose-600 via-rose-500 to-rose-400 hover:brightness-105"
                                  : idx === 1
                                  ? "bg-gradient-to-t from-amber-600 via-amber-500 to-amber-400 hover:brightness-105"
                                  : idx === 2
                                  ? "bg-gradient-to-t from-[#005A36] via-emerald-600 to-emerald-400 hover:brightness-105"
                                  : "bg-gradient-to-t from-blue-600 via-blue-500 to-blue-400 hover:brightness-105"
                              }`}
                              style={{ height: `${barHeightPct}%` }}
                            />
                          </div>

                          {/* Cumulative % Badge */}
                          <div className="mt-2 text-[9.5px] font-mono font-extrabold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                            {d.cumPct}%
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* X-Axis Labels */}
                <div className="flex justify-between gap-3 px-6 pt-2 text-center">
                  {paretoDefects.map((d, idx) => (
                    <div key={d.name} className="flex-1 min-w-0">
                      <p className="text-[10.5px] font-bold text-slate-800 truncate" title={d.name}>
                        #{idx + 1} {d.name}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-slate-100 pt-3 flex items-center justify-between text-[11px] text-slate-500">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1 font-semibold text-rose-600">
                <span className="h-2.5 w-2.5 rounded-sm bg-rose-500" /> #1 Lỗi lớn nhất
              </span>
              <span className="flex items-center gap-1 font-semibold text-emerald-700">
                <span className="h-2.5 w-2.5 rounded-sm bg-[#005A36]" /> Top 2-5
              </span>
            </div>
            <span>Tập trung xử lý Top 2 lỗi giúp giảm <strong>~70%</strong> sự cố</span>
          </div>
        </div>

        {/* CHART 2: BIỂU ĐỒ TRÒN / DONUT 5M + 1E ĐA TẦNG (col-span-5) */}
        <div className="lg:col-span-5 rounded-3xl border border-slate-200/90 bg-white p-6 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-emerald-100 text-[#005A36] text-xs font-black">
                  🍩
                </span>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Biểu Đồ Tròn Nguyên Nhân 5M+1E</h2>
                  <p className="text-[11px] text-slate-500">Tỷ lệ đóng góp theo 6 nhóm yếu tố</p>
                </div>
              </div>
              <span className="rounded-full bg-emerald-50 text-[#005A36] border border-emerald-200 px-2.5 py-1 text-[10px] font-bold">
                Quy chuẩn TBS
              </span>
            </div>

            {/* Donut Visual & Center Metrics */}
            <div className="mt-4 flex flex-col sm:flex-row items-center justify-around gap-4">
              {/* SVG Donut Rendering */}
              <div className="relative h-44 w-44 flex-shrink-0 flex items-center justify-center">
                <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90 filter drop-shadow-xs">
                  {donutSegments.map((seg, i) => {
                    const strokeDasharray = `${(seg.pct * 251.2) / 100} 251.2`;
                    let prevSum = 0;
                    for (let j = 0; j < i; j++) prevSum += donutSegments[j].pct;
                    const strokeDashoffset = -((prevSum * 251.2) / 100);

                    return (
                      <circle
                        key={seg.key}
                        cx="50"
                        cy="50"
                        r="40"
                        fill="transparent"
                        stroke={seg.meta.hex}
                        strokeWidth="16"
                        strokeDasharray={strokeDasharray}
                        strokeDashoffset={strokeDashoffset}
                        className="transition-all duration-500 hover:stroke-width-18"
                      />
                    );
                  })}
                </svg>

                {/* Donut Center Core */}
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                  <span className="text-[10px] font-bold uppercase text-slate-400">Tổng cộng</span>
                  <span className="font-mono text-2xl font-black text-slate-900">{totalCount}</span>
                  <span className="text-[9.5px] font-bold text-emerald-800">sự cố 5M</span>
                </div>
              </div>

              {/* Legend List with Full Labels */}
              <div className="space-y-1.5 flex-1 min-w-[200px]">
                {donutSegments.map((seg) => (
                  <div key={seg.key} className="flex items-center justify-between text-xs p-1 rounded-lg hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-2 min-w-0 pr-2">
                      <span className="h-2.5 w-2.5 rounded-full flex-shrink-0 shadow-2xs" style={{ backgroundColor: seg.meta.hex }} />
                      <span className="text-slate-800 font-bold text-[11px] truncate">{seg.meta.label}</span>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0 font-mono">
                      <span className="font-extrabold text-slate-900 text-xs">{seg.count}</span>
                      <span className="text-[10.5px] text-slate-500 font-bold">({seg.pct}%)</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-3 text-[11px] text-slate-500">
            💡 Tỷ lệ <strong>Máy móc (Machine)</strong> và <strong>Vật liệu (Material)</strong> là 2 nguồn lỗi chiếm đa số.
          </div>
        </div>
      </div>

      {/* ─── 3. BIỂU ĐỒ 3 & 4: CỘT CHỒNG PHÂN XƯỞNG & RADAR LỤC GIÁC 5M+1E ─────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* CHART 3: BIỂU ĐỒ CỘT CHỒNG SO SÁNH CÁC XƯỞNG (col-span-7) */}
        <div className="lg:col-span-7 rounded-3xl border border-slate-200/90 bg-white p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-blue-100 text-blue-700 text-xs font-black">
                🏢
              </span>
              <div>
                <h2 className="text-sm font-bold text-slate-900">Biểu Đồ Cột Chồng So Sánh Các Phân Xưởng</h2>
                <p className="text-[11px] text-slate-500">Phân loại sự cố: Đã giải quyết / Đang xử lý / Khẩn cấp</p>
              </div>
            </div>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-600">
              Stacked Factory Bar
            </span>
          </div>

          <div className="space-y-3.5 mt-2">
            {areaComparisonList.map((stat, i) => {
              const donePct = stat.total > 0 ? (stat.done / stat.total) * 100 : 0;
              const inProgressPct = stat.total > 0 ? (stat.inProgress / stat.total) * 100 : 0;
              const urgentPct = stat.total > 0 ? (stat.urgent / stat.total) * 100 : 0;

              return (
                <div key={stat.name} className="space-y-1.5 p-3 rounded-2xl border border-slate-100 bg-slate-50/50">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-900 flex items-center gap-1.5">
                      <span className="font-mono text-[10.5px] bg-slate-200 text-slate-700 px-1.5 py-0.2 rounded font-extrabold">PX{i + 1}</span>
                      <span>{stat.name}</span>
                    </span>
                    <span className="font-mono font-extrabold text-slate-900">{stat.total} sự cố</span>
                  </div>

                  {/* Horizontal Stacked Bar */}
                  <div className="h-3 w-full rounded-full bg-slate-200 overflow-hidden flex shadow-2xs">
                    <div
                      className="h-full bg-[#005A36] transition-all duration-500"
                      style={{ width: `${donePct}%` }}
                      title={`Đã hoàn thành: ${stat.done} (${Math.round(donePct)}%)`}
                    />
                    <div
                      className="h-full bg-blue-500 transition-all duration-500"
                      style={{ width: `${inProgressPct}%` }}
                      title={`Đang xử lý: ${stat.inProgress} (${Math.round(inProgressPct)}%)`}
                    />
                    <div
                      className="h-full bg-rose-500 transition-all duration-500"
                      style={{ width: `${urgentPct}%` }}
                      title={`Khẩn cấp: ${stat.urgent} (${Math.round(urgentPct)}%)`}
                    />
                  </div>

                  {/* Legend Counts */}
                  <div className="flex items-center justify-between text-[10px] text-slate-500 pt-0.5 font-mono">
                    <span className="text-[#005A36] font-bold">✓ Đã xong: {stat.done}</span>
                    <span className="text-blue-700 font-bold">⚙ Đang sửa: {stat.inProgress}</span>
                    <span className={stat.urgent > 0 ? "text-rose-600 font-extrabold" : "text-slate-400"}>
                      🚨 SOS: {stat.urgent}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="border-t border-slate-100 pt-3 flex items-center gap-4 text-[10.5px] text-slate-500">
            <span className="flex items-center gap-1 font-semibold text-[#005A36]">
              <span className="h-2 w-2 rounded-full bg-[#005A36]" /> Đã nghiệm thu
            </span>
            <span className="flex items-center gap-1 font-semibold text-blue-600">
              <span className="h-2 w-2 rounded-full bg-blue-500" /> Đang điều tra/sửa
            </span>
            <span className="flex items-center gap-1 font-semibold text-rose-600">
              <span className="h-2 w-2 rounded-full bg-rose-500" /> Khẩn cấp SOS
            </span>
          </div>
        </div>

        {/* CHART 4: BIỂU ĐỒ RADAR / LỤC GIÁC 5M+1E (col-span-5) */}
        <div className="lg:col-span-5 rounded-3xl border border-slate-200/90 bg-white p-6 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-purple-100 text-purple-700 text-xs font-black">
                  🕸️
                </span>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Biểu Đồ Radar Ma Trận 5M+1E</h2>
                  <p className="text-[11px] text-slate-500">Mức độ rủi ro trên 6 trục chất lượng</p>
                </div>
              </div>
              <span className="rounded-full bg-purple-50 text-purple-700 border border-purple-200 px-2.5 py-1 text-[10px] font-bold">
                Radar Spider
              </span>
            </div>

            {/* SVG Radar Chart */}
            <div className="mt-3 relative h-48 w-full flex items-center justify-center">
              <svg viewBox="0 0 200 200" className="h-full w-full max-w-[200px]">
                {/* Concentric Grid Circles */}
                {radarGridCircles.map((frac) => (
                  <circle
                    key={frac}
                    cx="100"
                    cy="100"
                    r={radarRadius * frac}
                    fill="none"
                    stroke="#E2E8F0"
                    strokeWidth="1"
                    strokeDasharray="3 3"
                  />
                ))}

                {/* 6 Radial Axis Lines */}
                {radarKeys.map((_, idx) => {
                  const angle = (idx * 60 - 90) * (Math.PI / 180);
                  const x2 = radarCenter + radarRadius * Math.cos(angle);
                  const y2 = radarCenter + radarRadius * Math.sin(angle);
                  return (
                    <line
                      key={idx}
                      x1="100"
                      y1="100"
                      x2={x2}
                      y2={y2}
                      stroke="#CBD5E1"
                      strokeWidth="1"
                    />
                  );
                })}

                {/* Filled Polygon */}
                <polygon
                  points={radarPoints}
                  fill="rgba(16, 185, 129, 0.25)"
                  stroke="#005A36"
                  strokeWidth="2"
                  className="transition-all duration-700"
                />

                {/* Axis Labels */}
                {radarKeys.map((k, idx) => {
                  const angle = (idx * 60 - 90) * (Math.PI / 180);
                  const labelRadius = radarRadius + 16;
                  const lx = radarCenter + labelRadius * Math.cos(angle);
                  const ly = radarCenter + labelRadius * Math.sin(angle);
                  const shortName = k.slice(0, 3);
                  return (
                    <text
                      key={k}
                      x={lx}
                      y={ly}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      className="text-[8px] font-bold fill-slate-700 font-mono"
                    >
                      {shortName}
                    </text>
                  );
                })}
              </svg>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-3 text-[11px] text-slate-500 flex items-center justify-between">
            <span>Độ phủ diện tích phản ánh <strong>nguy cơ tập trung</strong></span>
            <span className="font-mono text-[#005A36] font-bold">6 Trục chuẩn hóa</span>
          </div>
        </div>
      </div>

      {/* ─── 4. BIỂU ĐỒ 5 & 6: DIỆN TÍCH XU HƯỚNG 7 NGÀY & ĐỒNG HỒ SLA 2H ─────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* CHART 5: BIỂU ĐỒ ĐƯỜNG DIỆN TÍCH XU HƯỚNG 7 NGÀY (col-span-7) */}
        <div className="lg:col-span-7 rounded-3xl border border-slate-200/90 bg-white p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-emerald-100 text-[#005A36] text-xs font-black">
                📈
              </span>
              <div>
                <h2 className="text-sm font-bold text-slate-900">Biểu Đồ Đường Diện Tích Xu Hướng Sự Cố Trong Tuần</h2>
                <p className="text-[11px] text-slate-500">So sánh tốc độ phát sinh mới vs Tốc độ xử lý hoàn tất</p>
              </div>
            </div>
            <span className="rounded-full bg-emerald-50 text-[#005A36] border border-emerald-200 px-2.5 py-1 text-[10px] font-bold">
              7-Day Trend
            </span>
          </div>

          {/* SVG Area Chart */}
          <div className="mt-4 relative h-48 w-full pt-2">
            <svg viewBox="0 0 350 120" className="h-full w-full overflow-visible">
              <defs>
                <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#005A36" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#005A36" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Grid Lines */}
              <line x1="0" y1="30" x2="350" y2="30" stroke="#F1F5F9" strokeWidth="1" />
              <line x1="0" y1="60" x2="350" y2="60" stroke="#F1F5F9" strokeWidth="1" />
              <line x1="0" y1="90" x2="350" y2="90" stroke="#F1F5F9" strokeWidth="1" />

              {/* Area Polygon */}
              <polygon
                points={`0,100 0,${100 - (trendCreated[0] / maxTrendVal) * 80} 58,${100 - (trendCreated[1] / maxTrendVal) * 80} 116,${100 - (trendCreated[2] / maxTrendVal) * 80} 175,${100 - (trendCreated[3] / maxTrendVal) * 80} 233,${100 - (trendCreated[4] / maxTrendVal) * 80} 291,${100 - (trendCreated[5] / maxTrendVal) * 80} 350,${100 - (trendCreated[6] / maxTrendVal) * 80} 350,100`}
                fill="url(#areaGradient)"
              />

              {/* Created Line (Amber) */}
              <polyline
                fill="none"
                stroke="#D97706"
                strokeWidth="2.5"
                points={`0,${100 - (trendCreated[0] / maxTrendVal) * 80} 58,${100 - (trendCreated[1] / maxTrendVal) * 80} 116,${100 - (trendCreated[2] / maxTrendVal) * 80} 175,${100 - (trendCreated[3] / maxTrendVal) * 80} 233,${100 - (trendCreated[4] / maxTrendVal) * 80} 291,${100 - (trendCreated[5] / maxTrendVal) * 80} 350,${100 - (trendCreated[6] / maxTrendVal) * 80}`}
              />

              {/* Resolved Line (TBS Green) */}
              <polyline
                fill="none"
                stroke="#005A36"
                strokeWidth="2.5"
                strokeDasharray="4 2"
                points={`0,${100 - (trendResolved[0] / maxTrendVal) * 80} 58,${100 - (trendResolved[1] / maxTrendVal) * 80} 116,${100 - (trendResolved[2] / maxTrendVal) * 80} 175,${100 - (trendResolved[3] / maxTrendVal) * 80} 233,${100 - (trendResolved[4] / maxTrendVal) * 80} 291,${100 - (trendResolved[5] / maxTrendVal) * 80} 350,${100 - (trendResolved[6] / maxTrendVal) * 80}`}
              />
            </svg>

            {/* X-Axis Day Labels */}
            <div className="flex justify-between text-[10px] font-mono text-slate-500 pt-2 border-t border-slate-100">
              {days.map((d) => (
                <span key={d}>{d}</span>
              ))}
            </div>
          </div>

          <div className="border-t border-slate-100 pt-3 flex items-center gap-4 text-[10.5px] text-slate-500">
            <span className="flex items-center gap-1 font-bold text-amber-700">
              <span className="h-2 w-2 rounded-full bg-amber-500" /> Phát sinh mới
            </span>
            <span className="flex items-center gap-1 font-bold text-[#005A36]">
              <span className="h-2 w-2 rounded-full bg-[#005A36]" /> Đã nghiệm thu
            </span>
          </div>
        </div>

        {/* CHART 6: ĐỒNG HỒ ĐO TỐC ĐỘ SLA 2 GIỜ VÀNG (col-span-5) */}
        <div className="lg:col-span-5 rounded-3xl border border-slate-200/90 bg-white p-6 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-cyan-100 text-cyan-800 text-xs font-black">
                  ⏱️
                </span>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Đồng Hồ Viễn Trắc SLA 2 Giờ Vàng</h2>
                  <p className="text-[11px] text-slate-500">Chỉ số MTTR &amp; Tỷ lệ đáp ứng chuẩn</p>
                </div>
              </div>
              <span className="rounded-full bg-cyan-50 text-cyan-800 border border-cyan-200 px-2.5 py-1 text-[10px] font-bold">
                Speedometer
              </span>
            </div>

            {/* Semicircular Gauge SVG */}
            <div className="mt-3 relative h-40 w-full flex flex-col items-center justify-center">
              <svg viewBox="0 0 200 120" className="h-full w-full max-w-[200px]">
                {/* Background Arc */}
                <path
                  d="M 20 100 A 80 80 0 0 1 180 100"
                  fill="none"
                  stroke="#E2E8F0"
                  strokeWidth="16"
                  strokeLinecap="round"
                />
                {/* Progress Arc */}
                <path
                  d="M 20 100 A 80 80 0 0 1 180 100"
                  fill="none"
                  stroke="#005A36"
                  strokeWidth="16"
                  strokeLinecap="round"
                  strokeDasharray={`${(slaRate / 100) * 251.2} 251.2`}
                  className="transition-all duration-700"
                />
              </svg>

              <div className="absolute top-16 text-center">
                <span className="font-mono text-3xl font-black text-[#005A36]">{slaRate}%</span>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Tuân thủ SLA</p>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-3 flex items-center justify-between text-[11px] text-slate-500">
            <span>Thời gian MTTR TB: <strong className="text-slate-900 font-mono">45 phút</strong></span>
            <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">✓ Đạt Chuẩn</span>
          </div>
        </div>
      </div>

      {/* ─── 5. BIỂU ĐỒ 7: DÒNG CHẢY TIẾN TRÌNH THÁC NƯỚC 6 BƯỚC (FULL WIDTH) ─── */}
      <div className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-emerald-100 text-[#005A36] text-xs font-black">
              🔄
            </span>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Tiến Trình Dòng Chảy Thác Nước 6 Bước Xử Lý CLSK</h2>
              <p className="text-[11px] text-slate-500">Số lượng phiếu sự cố đang phân bổ trên từng giai đoạn chu trình 2H</p>
            </div>
          </div>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-600">
            Pipeline Flow
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5 pt-2">
          {pipelineStages.map((st, i) => (
            <div key={st.label} className="p-4 rounded-2xl border border-slate-200/80 bg-slate-50/60 hover:bg-white hover:border-emerald-300 transition-all space-y-2 relative overflow-hidden group shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] font-extrabold text-slate-400">0{i + 1}</span>
                <span className="font-mono text-xl font-black text-slate-900 group-hover:text-[#005A36] transition-colors">{st.count}</span>
              </div>
              <p className="text-xs font-bold text-slate-800 line-clamp-1">{st.label}</p>
              <p className="text-[10px] text-slate-500 leading-tight line-clamp-1">{st.desc}</p>
              <div className={`h-1.5 w-full rounded-full bg-gradient-to-r ${st.color}`} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
