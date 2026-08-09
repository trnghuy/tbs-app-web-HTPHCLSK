import { getPrisma } from "@/lib/prisma";
import ReportsCharts from "./reports-charts-lazy";
import { PageHeader } from "@/components/page-header";
import AreaFilter from "./area-filter";

const TREND_DAYS = 14;
const DAY_MS = 24 * 60 * 60 * 1000;

const STATUS_LABEL: Record<string, string> = {
  REPORTED: "Chờ tiếp nhận",
  INVESTIGATING: "Đang phân tích 5M+1E",
  ROOT_CAUSE_FOUND: "Đã chốt nguyên nhân",
  ASSIGNED: "Đã giao việc",
  IN_PROGRESS: "Đang sửa chữa",
  DONE: "Hoàn thành",
};

const STATUS_DOT: Record<string, string> = {
  REPORTED: "bg-amber-500",
  INVESTIGATING: "bg-blue-500",
  ROOT_CAUSE_FOUND: "bg-violet-500",
  ASSIGNED: "bg-cyan-500",
  IN_PROGRESS: "bg-rose-500",
  DONE: "bg-emerald-600",
};

function dayKey(d: Date) {
  return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
}

function timeAgo(iso: string | Date) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins} phút trước`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} giờ trước`;
  const days = Math.floor(hrs / 24);
  return `${days} ngày trước`;
}

export default async function AdminDashboard({
  searchParams,
}: {
  searchParams: Promise<{ areaId?: string }>;
}) {
  const prisma = await getPrisma();
  const since14d = new Date(Date.now() - TREND_DAYS * DAY_MS);
  const { areaId } = await searchParams;

  const issueWhere = areaId ? { areaId } : {};

  const [
    areas,
    totalCount,
    openCount,
    doneCount,
    statusGroups,
    issuesByDayRaw,
    issuesWithArea,
    openIssues,
    tasksForDuration,
  ] = await Promise.all([
    prisma.category.findMany({ where: { type: "AREA" }, orderBy: { order: "asc" } }),
    prisma.qualityIssue.count({ where: issueWhere }),
    prisma.qualityIssue.count({ where: { ...issueWhere, status: { not: "DONE" } } }),
    prisma.qualityIssue.count({ where: { ...issueWhere, status: "DONE" } }),
    prisma.qualityIssue.groupBy({ by: ["status"], _count: { _all: true }, where: issueWhere }),
    prisma.qualityIssue.findMany({
      where: { createdAt: { gte: since14d }, ...issueWhere },
      select: { createdAt: true },
    }),
    prisma.qualityIssue.findMany({
      where: issueWhere,
      select: { area: { select: { name: true } } },
    }),
    prisma.qualityIssue.findMany({
      where: { ...issueWhere, status: { not: "DONE" } },
      orderBy: { createdAt: "asc" },
      take: 10,
      select: {
        id: true,
        poCode: true,
        description: true,
        status: true,
        severity: true,
        createdAt: true,
        reporter: { select: { name: true } },
        team: { select: { name: true } },
        productionLine: { select: { name: true } },
        failureCategory: { select: { name: true } },
      },
    }),
    prisma.maintenanceTask.findMany({
      where: { status: "DONE", completedAt: { not: null }, issue: issueWhere },
      select: {
        completedAt: true,
        acceptedAt: true,
        createdAt: true,
        issue: { select: { failureCategory: { select: { name: true } } } },
      },
    }),
  ]);

  const investigatingCount = statusGroups
    .filter((g) => g.status === "REPORTED" || g.status === "INVESTIGATING")
    .reduce((sum, g) => sum + g._count._all, 0);

  const assignedCount = statusGroups
    .filter((g) => g.status === "ASSIGNED" || g.status === "IN_PROGRESS")
    .reduce((sum, g) => sum + g._count._all, 0);

  const issuesByStatus = statusGroups.map((g) => ({
    status: g.status,
    statusLabel: STATUS_LABEL[g.status] || g.status,
    count: g._count._all,
  }));

  const dayBuckets = new Map<string, number>();
  for (let i = TREND_DAYS - 1; i >= 0; i--) {
    dayBuckets.set(dayKey(new Date(Date.now() - i * DAY_MS)), 0);
  }
  for (const issue of issuesByDayRaw) {
    const key = dayKey(new Date(issue.createdAt));
    if (dayBuckets.has(key)) dayBuckets.set(key, (dayBuckets.get(key) || 0) + 1);
  }
  const issuesByDay = Array.from(dayBuckets.entries()).map(([date, count]) => ({ date, count }));

  const areaCountMap = new Map<string, number>();
  for (const issue of issuesWithArea) {
    const area = issue.area?.name || "Chưa phân khu vực";
    areaCountMap.set(area, (areaCountMap.get(area) || 0) + 1);
  }
  const issuesByArea = Array.from(areaCountMap.entries())
    .map(([area, count]) => ({ area, count }))
    .sort((a, b) => b.count - a.count);

  const failureStats = new Map<string, { count: number; totalMinutes: number; withDuration: number }>();
  for (const task of tasksForDuration) {
    const name = task.issue.failureCategory?.name || "Chưa phân loại";
    const entry = failureStats.get(name) || { count: 0, totalMinutes: 0, withDuration: 0 };
    entry.count++;
    if (task.completedAt) {
      const startTime = task.acceptedAt ?? task.createdAt;
      const minutes = Math.max(1, Math.round((task.completedAt.getTime() - startTime.getTime()) / 60000));
      entry.totalMinutes += minutes;
      entry.withDuration++;
    }
    failureStats.set(name, entry);
  }
  const top5Failures = Array.from(failureStats.entries())
    .map(([name, s]) => ({
      name,
      count: s.count,
      avgMinutes: s.withDuration > 0 ? Math.round(s.totalMinutes / s.withDuration) : null,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // ─── KPI Metric Cards (matching portal style) ───
  const kpiCards = [
    { label: "Tổng sự cố", value: totalCount, color: "slate", icon: "📋" },
    { label: "Đang xử lý", value: openCount, color: "amber", icon: "⏳" },
    { label: "Cần điều tra 5M+1E", value: investigatingCount, color: "rose", icon: "🔍" },
    { label: "Đã giao KTV sửa", value: assignedCount, color: "blue", icon: "🔧" },
    { label: "Hoàn thành", value: doneCount, color: "emerald", icon: "✅" },
  ];

  const colorMap: Record<string, { bg: string; border: string; text: string; dot: string }> = {
    slate:   { bg: "bg-slate-50",  border: "border-slate-200",  text: "text-slate-700",  dot: "bg-slate-400" },
    amber:   { bg: "bg-amber-50",  border: "border-amber-200",  text: "text-amber-700",  dot: "bg-amber-500" },
    rose:    { bg: "bg-rose-50",   border: "border-rose-200",   text: "text-rose-700",   dot: "bg-rose-500" },
    blue:    { bg: "bg-blue-50",   border: "border-blue-200",   text: "text-blue-700",   dot: "bg-blue-500" },
    emerald: { bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-700", dot: "bg-emerald-500" },
  };

  return (
    <div className="space-y-5">
      {/* Header Row */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold tracking-tight text-slate-900">Tổng quan Nhà Máy</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Dữ liệu thời gian thực · Cập nhật tự động
          </p>
        </div>
        <AreaFilter areas={areas} />
      </div>

      {/* ─── KPI Metric Row ─── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {kpiCards.map((c) => {
          const cm = colorMap[c.color];
          return (
            <div
              key={c.label}
              className={`relative overflow-hidden rounded-2xl border ${cm.border} ${cm.bg} p-4 transition-shadow hover:shadow-[0_2px_8px_rgba(0,0,0,0.04)]`}
            >
              <div className="flex items-start justify-between">
                <span className="text-lg">{c.icon}</span>
                <span className={`h-2 w-2 rounded-full ${cm.dot} ring-2 ring-white`} />
              </div>
              <div className="mt-3">
                <div className={`text-2xl font-extrabold tracking-tight ${cm.text} tabular-nums`}>
                  {c.value}
                </div>
                <div className="text-[11px] font-semibold text-slate-600 mt-0.5">
                  {c.label}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ─── Charts Section ─── */}
      <div>
        <div className="mb-3 flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
            Phân Tích & Biểu Đồ
          </h2>
        </div>
        <ReportsCharts issuesByStatus={issuesByStatus} issuesByDay={issuesByDay} issuesByArea={issuesByArea} />
      </div>

      {/* ─── Bottom Tables ─── */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Top 5 Lỗi */}
        <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
            <div className="flex items-center gap-2.5">
              <span className="h-2 w-2 rounded-full bg-rose-500" />
              <h2 className="text-sm font-bold text-slate-900">Top 5 Lỗi Thường Gặp</h2>
            </div>
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-bold text-slate-600">
              {top5Failures.length} lỗi
            </span>
          </div>
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/80 text-slate-500">
                <th className="w-10 px-5 py-2.5 font-bold">#</th>
                <th className="px-5 py-2.5 font-bold">Danh mục lỗi</th>
                <th className="px-5 py-2.5 text-right font-bold">Số lượng</th>
                <th className="px-5 py-2.5 text-right font-bold">TB xử lý</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {top5Failures.length === 0 && (
                <tr>
                  <td className="px-5 py-10 text-center text-slate-400" colSpan={4}>
                    Chưa có dữ liệu sự cố nào
                  </td>
                </tr>
              )}
              {top5Failures.map((f, i) => (
                <tr key={f.name} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-5 py-3 text-xs font-bold text-slate-400 tabular-nums">{i + 1}</td>
                  <td className="px-5 py-3 font-semibold text-slate-800">{f.name}</td>
                  <td className="px-5 py-3 text-right font-bold text-rose-600 tabular-nums">{f.count}</td>
                  <td className="px-5 py-3 text-right text-slate-600 tabular-nums">
                    {f.avgMinutes != null
                      ? f.avgMinutes >= 60
                        ? `${(f.avgMinutes / 60).toFixed(1)}h`
                        : `${f.avgMinutes} phút`
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Sự cố đang mở */}
        <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
            <div className="flex items-center gap-2.5">
              <span className="h-2 w-2 rounded-full bg-amber-500" />
              <h2 className="text-sm font-bold text-slate-900">Sự Cố Đang Mở</h2>
            </div>
            <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-bold text-amber-700">
              {openIssues.length} phiếu
            </span>
          </div>
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/80 text-slate-500">
                <th className="px-5 py-2.5 font-bold">PO</th>
                <th className="px-5 py-2.5 font-bold">Khu vực</th>
                <th className="px-5 py-2.5 font-bold">Trạng thái</th>
                <th className="px-5 py-2.5 font-bold">Từ lúc</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {openIssues.length === 0 && (
                <tr>
                  <td className="px-5 py-10 text-center text-slate-400" colSpan={4}>
                    Không có sự cố nào đang mở
                  </td>
                </tr>
              )}
              {openIssues.map((issue) => (
                <tr key={issue.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-5 py-3">
                    <span className="font-mono text-[11px] font-bold text-slate-800">{issue.poCode}</span>
                  </td>
                  <td className="px-5 py-3 text-slate-600">
                    {issue.team?.name || "—"} / {issue.productionLine?.name || "—"}
                  </td>
                  <td className="px-5 py-3">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-700">
                      <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[issue.status] || "bg-slate-400"}`} />
                      {STATUS_LABEL[issue.status] || issue.status}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-slate-500">{timeAgo(issue.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
