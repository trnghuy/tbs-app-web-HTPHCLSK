"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  AlertTriangle,
  Search,
  PlusCircle,
  Clock,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  UploadCloud,
  X,
  RefreshCw,
  Eye,
  FileText,
  Wrench,
  Sparkles,
  Camera,
  MapPin,
  Flame,
  Check,
  Zap,
  Tag,
  SlidersHorizontal,
  LayoutGrid,
  List,
  FileSpreadsheet,
  RotateCcw,
  ArrowRight,
  Shield,
  Layers,
  ArrowLeft,
  Building2,
  Activity,
  Radio,
  Timer,
  ShieldAlert,
  Gauge,
  TrendingUp,
} from "lucide-react";
import { BrandMark, BrandLogoFull } from "@/components/brand-logo";
import {
  QualityIssue,
  IssueStatus,
  Severity,
  Category,
  portalApi,
  STATUS_META,
  SEVERITY_META,
  ROLE_LABELS,
  UserPublic,
} from "@/lib/portal-client";

// Import report form component directly
import ReportIssueView from "./report/page";

export default function PortalHomePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const actionParam = searchParams.get("action");
  const statusParam = searchParams.get("status");

  // Show Report Form if action=report
  if (actionParam === "report") {
    return <ReportIssueView />;
  }

  return <PortalDashboardView initialStatus={statusParam || "ALL"} />;
}

function PortalDashboardView({ initialStatus }: { initialStatus: string }) {
  const router = useRouter();
  const { data: session } = useSession();
  const [currentUser, setCurrentUser] = useState<UserPublic | null>(null);
  const [issues, setIssues] = useState<QualityIssue[]>([]);
  const [areas, setAreas] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const sessionUser = session?.user as unknown as {
    id: string;
    name: string;
    employeeCode: string;
    role: UserPublic["role"];
    areaId?: string | null;
    areaName?: string | null;
  } | undefined;

  const effectiveUser: UserPublic | null = currentUser || (sessionUser ? {
    id: sessionUser.id,
    employeeCode: sessionUser.employeeCode,
    name: sessionUser.name,
    role: sessionUser.role,
    areaId: sessionUser.areaId,
    area: sessionUser.areaName ? { id: sessionUser.areaId || "", type: "AREA", name: sessionUser.areaName } : null,
  } : null);

  // Tab & View Mode
  const [activeTab, setActiveTab] = useState<"ALL" | "MY_ISSUES">("ALL");
  const [viewMode, setViewMode] = useState<"GRID" | "LIST">("GRID");

  // Pagination States (9 hoặc 12 thẻ/trang)
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(9);

  // Filter States
  const [statusFilter, setStatusFilter] = useState<string>(initialStatus);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedArea, setSelectedArea] = useState<string>("ALL");
  const [selectedSeverity, setSelectedSeverity] = useState<string>("ALL");
  const [sortBy, setSortBy] = useState<"NEWEST" | "OLDEST">("NEWEST");

  // ─── REAL-TIME CLOCK & SHIFT TELEMETRY (TASTE SKILL PRIORITY 6) ───────────
  const [currentTime, setCurrentTime] = useState<string>("");
  const [shiftInfo, setShiftInfo] = useState<{ name: string; time: string; progressPct: number; shiftBadge: string }>({
    name: "Ca Chiều",
    time: "14:00 - 22:00",
    progressPct: 75,
    shiftBadge: "CA 2 · ĐANG TRỰC",
  });

  const [greeting, setGreeting] = useState("BUỔI TỐI TẬP TRUNG");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const timeStr = now.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
      const dateStr = now.toLocaleDateString("vi-VN", { weekday: "short", day: "2-digit", month: "2-digit", year: "numeric" });
      setCurrentTime(`${timeStr} · ${dateStr}`);

      const h = now.getHours();
      const m = now.getMinutes();
      const currentMinute = h * 60 + m;

      if (h >= 6 && h < 14) {
        setGreeting("BUỔI SÁNG NĂNG LƯỢNG");
        const start = 6 * 60;
        const progress = Math.min(100, Math.max(0, Math.round(((currentMinute - start) / 480) * 100)));
        setShiftInfo({ name: "Ca Sáng (Ca 1)", time: "06:00 - 14:00", progressPct: progress, shiftBadge: "CA 1 · ĐANG TRỰC" });
      } else if (h >= 14 && h < 22) {
        setGreeting("BUỔI CHIỀU NĂNG LƯỢNG");
        const start = 14 * 60;
        const progress = Math.min(100, Math.max(0, Math.round(((currentMinute - start) / 480) * 100)));
        setShiftInfo({ name: "Ca Chiều (Ca 2)", time: "14:00 - 22:00", progressPct: progress, shiftBadge: "CA 2 · ĐANG TRỰC" });
      } else {
        setGreeting("BUỔI TỐI TẬP TRUNG");
        setShiftInfo({ name: "Ca Đêm (Ca 3)", time: "22:00 - 06:00", progressPct: 45, shiftBadge: "CA 3 · TRỰC ĐÊM" });
      }
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [meRes, issueList, areaList] = await Promise.all([
        portalApi.getMe().catch(() => null),
        portalApi.listIssues().catch(() => []),
        portalApi.listAreas().catch(() => []),
      ]);
      if (meRes?.user) setCurrentUser(meRes.user);
      setIssues(issueList);
      setAreas(areaList);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  const loadDataSilently = useCallback(async () => {
    try {
      const issueList = await portalApi.listIssues();
      setIssues(issueList);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    loadData();
    const timer = setInterval(loadDataSilently, 4000);
    return () => clearInterval(timer);
  }, [loadData, loadDataSilently]);

  useEffect(() => {
    if (initialStatus) {
      setStatusFilter(initialStatus);
    }
  }, [initialStatus]);

  // Counts for 5 Status KPIs
  const countPending = issues.filter((i) => i.status === "REPORTED").length;
  const countInvestigating = issues.filter(
    (i) => i.status === "INVESTIGATING" || i.status === "ROOT_CAUSE_FOUND" || i.status === "ASSIGNED" || i.status === "IN_PROGRESS"
  ).length;
  const countTrial = issues.filter((i) => (i as unknown as { status: string }).status === "TRIAL_RUN").length;
  const countDone = issues.filter((i) => i.status === "DONE").length;
  const countSos = issues.filter((i) => i.severity === "URGENT" || (i as unknown as { status: string }).status === "SOS_REQUESTED").length;

  // Filtered Issues list
  const filteredIssues = useMemo(() => {
    return issues
      .filter((issue) => {
        // Tab filter
        if (activeTab === "MY_ISSUES") {
          const myId = effectiveUser?.id;
          const isReporter = issue.reporterId === myId;
          const isAssignee = issue.task?.assignee?.id === myId;
          if (!isReporter && !isAssignee) return false;
        }

        // Status filter
        if (statusFilter !== "ALL") {
          if (statusFilter === "REPORTED" && issue.status !== "REPORTED") return false;
          if (
            statusFilter === "INVESTIGATING" &&
            issue.status !== "INVESTIGATING" &&
            issue.status !== "ROOT_CAUSE_FOUND" &&
            issue.status !== "ASSIGNED" &&
            issue.status !== "IN_PROGRESS"
          )
            return false;
          if (statusFilter === "TRIAL_RUN" && (issue as unknown as { status: string }).status !== "TRIAL_RUN") return false;
          if (statusFilter === "DONE" && issue.status !== "DONE") return false;
          if (statusFilter === "URGENT" && issue.severity !== "URGENT" && (issue as unknown as { status: string }).status !== "SOS_REQUESTED")
            return false;
        }

        // Area filter
        if (selectedArea !== "ALL" && issue.areaId !== selectedArea) return false;

        // Severity filter
        if (selectedSeverity !== "ALL" && issue.severity !== selectedSeverity) return false;

        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.trim().toLowerCase();
          const matchesPo = issue.poCode.toLowerCase().includes(q);
          const matchesDesc = issue.description.toLowerCase().includes(q);
          const matchesReporter = (issue.reporter?.name || "").toLowerCase().includes(q);
          const matchesRoot = (issue.rootCause || "").toLowerCase().includes(q);
          if (!matchesPo && !matchesDesc && !matchesReporter && !matchesRoot) return false;
        }

        return true;
      })
      .sort((a, b) => {
        const timeA = new Date(a.createdAt).getTime();
        const timeB = new Date(b.createdAt).getTime();
        return sortBy === "NEWEST" ? timeB - timeA : timeA - timeB;
      });
  }, [
    issues,
    activeTab,
    effectiveUser,
    statusFilter,
    selectedArea,
    selectedSeverity,
    searchQuery,
    sortBy,
  ]);

  // Reset page to 1 on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, searchQuery, selectedArea, selectedSeverity, sortBy, activeTab, pageSize]);

  const totalPages = Math.ceil(filteredIssues.length / pageSize) || 1;
  const paginatedIssues = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredIssues.slice(startIndex, startIndex + pageSize);
  }, [filteredIssues, currentPage, pageSize]);

  function handleResetFilters() {
    setStatusFilter("ALL");
    setSearchQuery("");
    setSelectedArea("ALL");
    setSelectedSeverity("ALL");
    setSortBy("NEWEST");
    setActiveTab("ALL");
    setCurrentPage(1);
  }

  function handleExportExcel() {
    const csvContent =
      "data:text/csv;charset=utf-8," +
      ["Mã PO,Phân xưởng,Mức độ,Trạng thái,Mô tả,Nguyên nhân,Người báo,Ngày tạo"]
        .concat(
          filteredIssues.map(
            (i) =>
              `"${i.poCode}","${i.area?.name || ""}","${i.severity}","${i.status}","${i.description.replace(/"/g, '""')}","${(i.rootCause || "").replace(/"/g, '""')}","${i.reporter?.name || ""}","${new Date(i.createdAt).toLocaleDateString("vi-VN")}"`
          )
        )
        .join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Bao_Cao_CLSK_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  const displayName = effectiveUser?.name || sessionUser?.name || "Người Dùng";
  const displayCode = effectiveUser?.employeeCode || sessionUser?.employeeCode || "";
  const displayArea =
    effectiveUser?.role === "DIRECTOR" || sessionUser?.role === "DIRECTOR"
      ? "Toàn nhà máy"
      : effectiveUser?.area?.name || sessionUser?.areaName || "Xưởng May 1";

  const totalAll = issues.length;
  const donePctAll = totalAll > 0 ? Math.round((countDone / totalAll) * 100) : 100;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-24">
      {/* ─── 1. ASYMMETRIC INDUSTRIAL BENTO COCKPIT (TASTE SKILL PRIORITIES 3, 4, 6) ─ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* TILE 1 (Col-8): EXECUTIVE SHIFT NARRATIVE & ACTION TILE */}
        <div className="lg:col-span-8 relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#005A36] via-[#0A4A2F] to-[#043320] text-white p-6 sm:p-7 shadow-md border border-emerald-800/40 flex flex-col justify-between space-y-5">
          {/* Tactile grid overlay */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(141,198,63,0.18),transparent_65%)] pointer-events-none" />
          <div className="absolute right-0 bottom-0 h-40 w-40 bg-[radial-gradient(circle,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:16px_16px] pointer-events-none" />

          <div className="relative z-10 space-y-4">
            {/* Top Bar: Clean Brand & Plant Header */}
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3.5">
                <BrandLogoFull height={34} />
                <div className="h-5 w-px bg-white/20 hidden sm:block" />
                <span className="text-xs font-bold text-emerald-200 uppercase tracking-wider hidden sm:block">
                  Skechers Kiên Giang 1
                </span>
              </div>

              <div className="text-right">
                <span className="text-xs font-semibold text-emerald-200/90">
                  Quy trình 15p Cảnh Báo &amp; 2h Xử Lý
                </span>
              </div>
            </div>

            {/* Greeting & Executive Context */}
            <div className="space-y-1 pt-1">
              <div className="text-[11px] font-bold text-emerald-200/90 uppercase tracking-wider">
                {greeting}{displayCode ? ` · MNV: ${displayCode}` : ""}
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-2">
                <span>{displayName}</span>
                <span>👋</span>
              </h1>
              <p className="text-xs text-emerald-100/90 font-medium max-w-2xl leading-relaxed pt-1">
                “Chúc bạn và Phân xưởng <strong>{displayArea}</strong> một ca làm việc an toàn, kiểm soát 100% chất lượng và kích hoạt phản hồi thần tốc trong 2 giờ vàng!”
              </p>
            </div>
          </div>


          {/* Bottom Action Strip inside Hero */}
          <div className="relative z-10 flex items-center gap-3 flex-wrap pt-2 border-t border-white/10">
            <Link
              href="/portal?action=report"
              className="flex items-center gap-2 rounded-2xl bg-lime-400 text-[#00472A] px-4 py-2.5 text-xs font-black shadow-md hover:bg-lime-300 active:scale-98 transition-all"
            >
              <PlusCircle size={15} />
              <span>BÁO CÁO VẤN ĐỀ (SLA 15P)</span>
            </Link>

            <Link
              href="/portal/library"
              className="flex items-center gap-1.5 rounded-2xl bg-white/10 hover:bg-white/15 text-white border border-white/15 px-3.5 py-2.5 text-xs font-bold backdrop-blur-md transition-all"
            >
              <FileText size={14} className="text-emerald-300" />
              <span>Thư Viện PO &amp; Bài Học</span>
            </Link>

            <Link
              href="/portal/stats"
              className="flex items-center gap-1.5 rounded-2xl bg-white/10 hover:bg-white/15 text-white border border-white/15 px-3.5 py-2.5 text-xs font-bold backdrop-blur-md transition-all"
            >
              <TrendingUp size={14} className="text-amber-300" />
              <span>Top 5 Lỗi &amp; Pareto</span>
            </Link>
          </div>
        </div>

        {/* TILE 2 (Col-4): FACTORY REAL-TIME TELEMETRY & SHIFT MONITOR */}
        <div className="lg:col-span-4 rounded-3xl border border-slate-200/90 bg-white p-5 shadow-xs flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            {/* Live Clock */}
            <div className="p-3.5 rounded-2xl bg-slate-900 text-white space-y-1">
              <div className="flex items-center justify-between text-[10.5px] font-bold text-slate-400">
                <span className="flex items-center gap-1">
                  <Clock size={12} className="text-lime-400" />
                  <span>ĐỒNG HỒ CA SẢN XUẤT</span>
                </span>
              </div>
              <p className="font-mono text-lg sm:text-xl font-bold tracking-tight text-lime-300">
                {currentTime || "21:38:45"}
              </p>
            </div>


            {/* Shift Progress */}
            <div className="p-3.5 rounded-2xl border border-slate-100 bg-slate-50/70 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-800">{shiftInfo.name}</span>
                <span className="font-mono text-[11px] font-bold text-slate-500">{shiftInfo.time}</span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-200 overflow-hidden">
                <div
                  className="h-full rounded-full bg-[#005A36] transition-all duration-500"
                  style={{ width: `${shiftInfo.progressPct}%` }}
                />
              </div>
              <p className="text-[10px] text-slate-500 text-right font-medium">
                Đã hoàn thành <strong>{shiftInfo.progressPct}%</strong> thời lượng ca
              </p>
            </div>
          </div>

          {/* 2-Hour SLA Meter */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-100 text-[#005A36]">
                <Zap size={15} />
              </div>
              <div>
                <p className="text-[11px] font-bold text-slate-900">Tuân Thủ 2H SLA</p>
                <p className="text-[10px] text-slate-500">MTTR: ~45 phút / sự cố</p>
              </div>
            </div>
            <span className="font-mono text-base font-black text-[#005A36]">{donePctAll}%</span>
          </div>
        </div>
      </div>

      {/* ─── 2. 5 CONTEXTUAL ASYMMETRIC KPI CARDS (PRIORITY 5) ───────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {/* Card 1: Chưa Xử Lý */}
        <button
          type="button"
          onClick={() => setStatusFilter(statusFilter === "REPORTED" ? "ALL" : "REPORTED")}
          className={`rounded-3xl border p-4 text-left transition-all relative overflow-hidden group ${
            statusFilter === "REPORTED"
              ? "border-amber-400 bg-amber-50/90 ring-2 ring-amber-400/40 shadow-xs"
              : "border-slate-200/90 bg-white hover:border-amber-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-amber-100 text-amber-900 text-xs">
              <Clock size={14} />
            </div>
            <span className="font-mono text-2xl font-black text-slate-900">{countPending}</span>
          </div>
          <p className="text-xs font-bold text-slate-900 mt-2">1. Chưa Xử Lý</p>
          <p className="text-[10px] text-slate-500">SLA 15 phút tại hiện trường</p>
          <div className="mt-2 pt-2 border-t border-slate-100 text-[9.5px] font-bold text-amber-700 flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
            <span>Cần tiếp nhận 5M+1E</span>
          </div>
        </button>

        {/* Card 2: Đang Xử Lý */}
        <button
          type="button"
          onClick={() => setStatusFilter(statusFilter === "INVESTIGATING" ? "ALL" : "INVESTIGATING")}
          className={`rounded-3xl border p-4 text-left transition-all relative overflow-hidden group ${
            statusFilter === "INVESTIGATING"
              ? "border-blue-400 bg-blue-50/90 ring-2 ring-blue-400/40 shadow-xs"
              : "border-slate-200/90 bg-white hover:border-blue-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-blue-100 text-blue-900 text-xs">
              <Shield size={14} />
            </div>
            <span className="font-mono text-2xl font-black text-slate-900">{countInvestigating}</span>
          </div>
          <p className="text-xs font-bold text-slate-900 mt-2">2. Đang Xử Lý</p>
          <p className="text-[10px] text-slate-500">Điều tra 5M &amp; Sửa máy</p>
          <div className="mt-2 pt-2 border-t border-slate-100 text-[9.5px] font-bold text-blue-700 flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
            <span>KTV đang phối hợp</span>
          </div>
        </button>

        {/* Card 3: Chạy Thử */}
        <button
          type="button"
          onClick={() => setStatusFilter(statusFilter === "TRIAL_RUN" ? "ALL" : "TRIAL_RUN")}
          className={`rounded-3xl border p-4 text-left transition-all relative overflow-hidden group ${
            statusFilter === "TRIAL_RUN"
              ? "border-purple-400 bg-purple-50/90 ring-2 ring-purple-400/40 shadow-xs"
              : "border-slate-200/90 bg-white hover:border-purple-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-purple-100 text-purple-900 text-xs">
              <Layers size={14} />
            </div>
            <span className="font-mono text-2xl font-black text-slate-900">{countTrial}</span>
          </div>
          <p className="text-xs font-bold text-slate-900 mt-2">3. Chạy Thử</p>
          <p className="text-[10px] text-slate-500">Đo lường 3h - 48h</p>
          <div className="mt-2 pt-2 border-t border-slate-100 text-[9.5px] font-bold text-purple-700 flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-purple-500" />
            <span>Theo dõi 20 đôi ra</span>
          </div>
        </button>

        {/* Card 4: Đã Xử Lý Xong */}
        <button
          type="button"
          onClick={() => setStatusFilter(statusFilter === "DONE" ? "ALL" : "DONE")}
          className={`rounded-3xl border p-4 text-left transition-all relative overflow-hidden group ${
            statusFilter === "DONE"
              ? "border-emerald-400 bg-emerald-50/90 ring-2 ring-emerald-400/40 shadow-xs"
              : "border-slate-200/90 bg-white hover:border-emerald-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-emerald-100 text-[#005A36] text-xs">
              <CheckCircle2 size={14} />
            </div>
            <span className="font-mono text-2xl font-black text-[#005A36]">{countDone}</span>
          </div>
          <p className="text-xs font-bold text-slate-900 mt-2">4. Đã Xử Lý Xong</p>
          <p className="text-[10px] text-slate-500">QA đã nghiệm thu đóng phiếu</p>
          <div className="mt-2 pt-2 border-t border-slate-100 text-[9.5px] font-bold text-emerald-700 flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            <span>Đạt 100% tiêu chuẩn</span>
          </div>
        </button>

        {/* Card 5: SOS Khẩn Cấp */}
        <button
          type="button"
          onClick={() => setStatusFilter(statusFilter === "URGENT" ? "ALL" : "URGENT")}
          className={`rounded-3xl border p-4 text-left transition-all relative overflow-hidden group ${
            statusFilter === "URGENT" || statusFilter === "SOS_REQUESTED"
              ? "border-rose-400 bg-rose-50/90 ring-2 ring-rose-400/40 shadow-xs"
              : "border-slate-200/90 bg-white hover:border-rose-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-rose-600 text-white text-xs">
              <AlertTriangle size={14} />
            </div>
            <span className="font-mono text-2xl font-black text-rose-600">{countSos}</span>
          </div>

          <p className="text-xs font-bold text-slate-900 mt-2">5. 🚨 SOS Khẩn Cấp</p>
          <p className="text-[10px] text-slate-500">Dừng chuyền / Nguy cơ cao</p>
          <div className="mt-2 pt-2 border-t border-slate-100 text-[9.5px] font-bold text-rose-700 flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
            <span>Báo Ban Giám Đốc</span>
          </div>
        </button>
      </div>

      {/* ─── 3. ACTION & VIEW MODE CONTROL STRIP ──────────────────────────── */}
      <div className="rounded-3xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Main Scope Tabs */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab("ALL")}
              className={`flex items-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-bold transition-all ${
                activeTab === "ALL"
                  ? "bg-[#005A36] text-white shadow-xs"
                  : "bg-slate-50 text-slate-600 hover:bg-slate-100"
              }`}
            >
              <span>📁 Tất cả sự cố ({issues.length})</span>
            </button>

            <button
              onClick={() => setActiveTab("MY_ISSUES")}
              className={`flex items-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-bold transition-all ${
                activeTab === "MY_ISSUES"
                  ? "bg-[#005A36] text-white shadow-xs"
                  : "bg-slate-50 text-slate-600 hover:bg-slate-100"
              }`}
            >
              <span>👤 Việc của tôi</span>
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* View Mode Toggle */}
            <div className="flex items-center rounded-2xl border border-slate-200 bg-slate-50 p-1">
              <button
                onClick={() => setViewMode("GRID")}
                className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                  viewMode === "GRID" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-500 hover:text-slate-900"
                }`}
              >
                <LayoutGrid size={13} />
                <span>Lưới</span>
              </button>

              <button
                onClick={() => setViewMode("LIST")}
                className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                  viewMode === "LIST" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-500 hover:text-slate-900"
                }`}
              >
                <List size={13} />
                <span>Danh sách</span>
              </button>
            </div>

            <button
              onClick={loadData}
              className="flex items-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
            >
              <RefreshCw size={13} className={loading ? "animate-spin text-[#005A36]" : "text-slate-400"} />
              <span>Làm mới</span>
            </button>

            <Link
              href="/portal?action=report"
              className="flex items-center gap-1.5 rounded-2xl bg-[#005A36] px-4 py-2 text-xs font-extrabold text-white shadow-xs hover:bg-[#00472A] active:scale-98 transition-all"
            >
              <PlusCircle size={14} className="text-lime-300" />
              <span>BÁO CÁO VẤN ĐỀ</span>
            </Link>

            <button
              onClick={handleExportExcel}
              className="flex items-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
            >
              <FileSpreadsheet size={13} className="text-emerald-700" />
              <span>Excel</span>
            </button>
          </div>
        </div>

        {/* Filter Strip */}
        <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
          <button
            onClick={() => setStatusFilter("ALL")}
            className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
              statusFilter === "ALL"
                ? "bg-emerald-100 text-[#005A36] border border-emerald-300"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            Tất cả loại
          </button>

          {/* Search Input */}
          <div className="relative min-w-[180px] flex-1">
            <Search size={13} className="absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm PO, lỗi, người báo..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50/70 pl-8 pr-3 py-1.5 text-xs font-medium text-slate-900 focus:border-[#005A36] focus:bg-white focus:outline-none"
            />
          </div>

          {/* Area Dropdown */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 flex items-center gap-1">
            <Building2 size={12} className="text-slate-400" />
            <select
              value={selectedArea}
              onChange={(e) => setSelectedArea(e.target.value)}
              className="bg-transparent text-xs font-semibold text-slate-900 focus:outline-none cursor-pointer"
            >
              <option value="ALL">Khu vực: Tất cả</option>
              {areas.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>

          {/* Severity Dropdown */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 flex items-center gap-1">
            <AlertTriangle size={12} className="text-slate-400" />
            <select
              value={selectedSeverity}
              onChange={(e) => setSelectedSeverity(e.target.value)}
              className="bg-transparent text-xs font-semibold text-slate-900 focus:outline-none cursor-pointer"
            >
              <option value="ALL">Mức độ: Tất cả</option>
              <option value="LOW">Thấp</option>
              <option value="MEDIUM">Trung Bình</option>
              <option value="HIGH">Cao</option>
              <option value="URGENT">Khẩn Cấp (SOS)</option>
            </select>
          </div>

          {/* Sort Dropdown */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 flex items-center gap-1">
            <Clock size={12} className="text-slate-400" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as "NEWEST" | "OLDEST")}
              className="bg-transparent text-xs font-semibold text-slate-900 focus:outline-none cursor-pointer"
            >
              <option value="NEWEST">Mới nhất</option>
              <option value="OLDEST">Cũ nhất</option>
            </select>
          </div>

          {/* Reset Button */}
          <button
            onClick={handleResetFilters}
            className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-colors"
          >
            <RotateCcw size={12} />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* ─── 4. LIVE INCIDENTS FEED (GRID / LIST VIEW + PHÂN TRANG 9-12 THẺ) ─── */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Danh Sách Sự Cố ({filteredIssues.length})
            </h2>
            <p className="text-xs text-slate-500">
              {statusFilter !== "ALL" ? `Đang lọc theo trạng thái: ${statusFilter}` : "Tất cả sự cố được ghi nhận trên chuyền"}
            </p>
          </div>

          {/* Page size toggle */}
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
            <span>Hiển thị:</span>
            {[9, 12].map((size) => (
              <button
                key={size}
                type="button"
                onClick={() => setPageSize(size)}
                className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
                  pageSize === size
                    ? "bg-[#005A36] text-white shadow-2xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {size} thẻ/trang
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="py-16 text-center text-slate-400 rounded-3xl border border-slate-200 bg-white">
            <RefreshCw size={24} className="mx-auto animate-spin text-[#005A36]" />
            <p className="mt-2 text-xs font-medium">Đang tải danh sách sự cố...</p>
          </div>
        ) : filteredIssues.length === 0 ? (
          <div className="py-12 text-center text-slate-400 rounded-3xl border border-dashed border-slate-200 bg-white">
            <p className="text-xs font-medium">Không tìm thấy sự cố nào trong danh mục này.</p>
          </div>
        ) : (
          <>
            {viewMode === "GRID" ? (
              /* Grid View (9-12 thẻ trên trang) */
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {paginatedIssues.map((issue) => {
                  const statusMeta = STATUS_META[issue.status] || STATUS_META.REPORTED;
                  const severityMeta = SEVERITY_META[issue.severity] || SEVERITY_META.MEDIUM;

                  return (
                    <div
                      key={issue.id}
                      onClick={() => router.push(`/portal/issues/${issue.id}`)}
                      className="flex flex-col justify-between rounded-3xl border border-slate-200/90 bg-white p-5 shadow-xs hover:border-emerald-400 hover:shadow-sm transition-all cursor-pointer group"
                    >
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-xs font-extrabold text-slate-900 bg-slate-100 px-2.5 py-0.5 rounded-md border border-slate-200 group-hover:text-[#005A36] transition-colors">
                            PO {issue.poCode}
                          </span>
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${statusMeta.bg} ${statusMeta.text}`}>
                            {statusMeta.label}
                          </span>
                        </div>

                        <p className="text-xs font-bold text-slate-800 line-clamp-2 leading-relaxed group-hover:text-[#005A36] transition-colors">
                          {issue.description}
                        </p>

                        {issue.rootCause && (
                          <div className="text-[10.5px] text-emerald-950 bg-emerald-50/80 p-2 rounded-xl border border-emerald-200 font-medium line-clamp-2">
                            🌿 <strong>Nguyên nhân:</strong> {issue.rootCause}
                          </div>
                        )}
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                        <div>
                          <p className="font-semibold text-slate-700">{issue.area?.name || "Xưởng"}</p>
                          <p className="font-mono text-[10px] text-slate-400">{new Date(issue.createdAt).toLocaleDateString("vi-VN")}</p>
                        </div>

                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${severityMeta.bg} ${severityMeta.text}`}>
                          {severityMeta.label}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* List View (9-12 dòng trên trang) */
              <div className="rounded-3xl border border-slate-200 bg-white divide-y divide-slate-100 overflow-hidden shadow-xs">
                {paginatedIssues.map((issue) => {
                  const statusMeta = STATUS_META[issue.status] || STATUS_META.REPORTED;
                  const severityMeta = SEVERITY_META[issue.severity] || SEVERITY_META.MEDIUM;

                  return (
                    <div
                      key={issue.id}
                      onClick={() => router.push(`/portal/issues/${issue.id}`)}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                            PO {issue.poCode}
                          </span>
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${statusMeta.bg} ${statusMeta.text}`}>
                            {statusMeta.label}
                          </span>
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${severityMeta.bg} ${severityMeta.text}`}>
                            {severityMeta.label}
                          </span>
                          <span className="text-[11px] text-slate-500 font-medium">
                            {issue.area?.name || "Xưởng"}
                          </span>
                        </div>

                        <p className="text-xs font-semibold text-slate-800 line-clamp-1">
                          {issue.description}
                        </p>
                      </div>

                      <div className="flex items-center gap-3 self-end sm:self-center">
                        <span className="font-mono text-xs text-slate-400">
                          {new Date(issue.createdAt).toLocaleDateString("vi-VN")}
                        </span>
                        <ChevronRight size={14} className="text-slate-400" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* ─── PHÂN TRANG (PAGINATION BAR) ─────────────────────────────── */}
            {totalPages > 1 && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t border-slate-200/80">
                <p className="text-xs text-slate-500 font-medium">
                  Hiển thị <strong>{(currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, filteredIssues.length)}</strong> trong tổng số <strong>{filteredIssues.length}</strong> sự cố
                </p>

                <div className="flex items-center gap-1.5 flex-wrap self-end sm:self-auto">
                  <button
                    type="button"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-2xs"
                  >
                    <ChevronLeft size={13} />
                    <span>Trang trước</span>
                  </button>

                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => {
                    const isActive = pageNum === currentPage;
                    return (
                      <button
                        key={pageNum}
                        type="button"
                        onClick={() => setCurrentPage(pageNum)}
                        className={`h-8 min-w-8 px-2 rounded-xl text-xs font-bold transition-all ${
                          isActive
                            ? "bg-[#005A36] text-white shadow-2xs"
                            : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}

                  <button
                    type="button"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-2xs"
                  >
                    <span>Trang sau</span>
                    <ChevronRight size={13} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
