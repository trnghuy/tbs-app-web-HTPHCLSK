"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Wrench,
  Clock,
  CheckCircle2,
  AlertTriangle,
  UserCheck,
  Send,
  RefreshCw,
  PlusCircle,
  X,
  Layers,
  ChevronRight,
  ShieldCheck,
  Calendar,
  Zap,
  Check,
  User,
} from "lucide-react";
import {
  QualityIssue,
  UserPublic,
  portalApi,
  STATUS_META,
  SEVERITY_META,
  ROLE_LABELS,
} from "@/lib/portal-client";

// Format elapsed time
function formatElapsed(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

export default function WorkManagementPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<UserPublic | null>(null);
  const [issues, setIssues] = useState<QualityIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"PENDING" | "IN_PROGRESS" | "DONE">("PENDING");

  // Assignment dialog state (for Department Head)
  const [assignIssue, setAssignIssue] = useState<QualityIssue | null>(null);
  const [technicians, setTechnicians] = useState<UserPublic[]>([]);
  const [selectedTech, setSelectedTech] = useState<UserPublic | null>(null);
  const [assigning, setAssigning] = useState(false);
  const [assignError, setAssignError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [meRes, issueList] = await Promise.all([
        portalApi.getMe().catch(() => null),
        portalApi.listIssues(),
      ]);
      if (meRes?.user) setCurrentUser(meRes.user);
      setIssues(issueList);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Open assign dialog
  async function openAssignDialog(issue: QualityIssue) {
    setAssignIssue(issue);
    setSelectedTech(null);
    setAssignError(null);
    try {
      const techList = await portalApi.searchMaintenanceInArea();
      setTechnicians(techList);
    } catch {
      setTechnicians([]);
    }
  }

  // Handle assign submit
  async function handleAssignSubmit() {
    if (!assignIssue || !selectedTech) return;
    setAssigning(true);
    setAssignError(null);
    try {
      await portalApi.assignTask(assignIssue.id, selectedTech.id);
      setAssignIssue(null);
      await loadData();
    } catch (err: unknown) {
      setAssignError(err instanceof Error ? err.message : "Không thể giao việc");
    } finally {
      setAssigning(false);
    }
  }

  // Handle Quick Accept
  async function handleQuickAccept(taskId: string) {
    try {
      await portalApi.acceptTask(taskId);
      await loadData();
    } catch {
      // ignore
    }
  }

  const role = currentUser?.role;
  const isDeptHead = role === "DEPARTMENT_HEAD";
  const isMaintenance = role === "MAINTENANCE";

  // Filter tasks based on role and active tab
  let filteredItems: QualityIssue[] = [];

  if (isDeptHead) {
    if (activeTab === "PENDING") {
      filteredItems = issues.filter((i) => i.status === "ROOT_CAUSE_FOUND");
    } else if (activeTab === "IN_PROGRESS") {
      filteredItems = issues.filter((i) => i.status === "ASSIGNED" || i.status === "IN_PROGRESS");
    } else {
      filteredItems = issues.filter((i) => i.status === "DONE");
    }
  } else if (isMaintenance) {
    filteredItems = issues.filter((i) => {
      if (!i.task || i.task.assigneeId !== currentUser?.id) return false;
      if (activeTab === "PENDING") return i.task.status === "PENDING";
      if (activeTab === "IN_PROGRESS") return i.task.status === "ACCEPTED";
      return i.task.status === "DONE";
    });
  } else {
    if (activeTab === "PENDING") {
      filteredItems = issues.filter((i) => i.status === "ROOT_CAUSE_FOUND" || (i.task && i.task.status === "PENDING"));
    } else if (activeTab === "IN_PROGRESS") {
      filteredItems = issues.filter((i) => i.status === "ASSIGNED" || i.status === "IN_PROGRESS" || (i.task && i.task.status === "ACCEPTED"));
    } else {
      filteredItems = issues.filter((i) => i.status === "DONE" || (i.task && i.task.status === "DONE"));
    }
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* ─── 1. HEADER BANNER ─────────────────────────────────────────────── */}
      <div className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#005A36] text-white shadow-2xs">
              <Wrench size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10.5px] font-extrabold uppercase tracking-wider text-[#005A36] bg-emerald-50 px-2 py-0.2 rounded-md">
                  Trung Tâm Phân Công &amp; Sửa Chữa
                </span>
              </div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl mt-0.5">
                Quản Lý Nhiệm Vụ &amp; Sửa Chữa Máy
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                {isDeptHead
                  ? "Phân công sự cố cho kỹ thuật viên bảo trì và giám sát tiến độ hoàn thành."
                  : isMaintenance
                  ? "Tiếp nhận nhiệm vụ được giao, bấm giờ sửa chữa và lập biên bản thay thế phụ tùng."
                  : "Theo dõi dòng chảy xử lý sự cố chất lượng từ phân xưởng đến bảo trì."}
              </p>
            </div>
          </div>

          <button
            onClick={loadData}
            className="flex items-center gap-1.5 self-start sm:self-auto rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <RefreshCw size={13} className={loading ? "animate-spin text-[#005A36]" : "text-slate-400"} />
            <span>Làm mới</span>
          </button>
        </div>
      </div>

      {/* ─── 2. REFINED FILTER TABS ───────────────────────────────────────── */}
      <div className="flex items-center gap-1.5 border-b border-slate-200/80 pb-3">
        <button
          onClick={() => setActiveTab("PENDING")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
            activeTab === "PENDING"
              ? "bg-amber-500 text-slate-950 shadow-2xs font-extrabold"
              : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
          }`}
        >
          <AlertTriangle size={14} />
          <span>{isDeptHead ? "Chờ phân công KTV" : "Cần trợ giúp / Chờ nhận việc"}</span>
        </button>

        <button
          onClick={() => setActiveTab("IN_PROGRESS")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
            activeTab === "IN_PROGRESS"
              ? "bg-[#005A36] text-white shadow-2xs font-extrabold"
              : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
          }`}
        >
          <Clock size={14} />
          <span>Đang xử lý sửa chữa</span>
        </button>

        <button
          onClick={() => setActiveTab("DONE")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
            activeTab === "DONE"
              ? "bg-emerald-700 text-white shadow-2xs font-extrabold"
              : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
          }`}
        >
          <CheckCircle2 size={14} />
          <span>Đã hoàn thành nghiệm thu</span>
        </button>
      </div>

      {/* ─── 3. WORK ITEMS GRID ───────────────────────────────────────────── */}
      {loading ? (
        <div className="py-16 text-center text-slate-400 rounded-3xl border border-slate-200 bg-white">
          <RefreshCw size={24} className="mx-auto animate-spin text-[#005A36]" />
          <p className="mt-2 text-xs font-medium">Đang tải danh sách công việc...</p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-white py-16 text-center">
          <Wrench size={32} className="mx-auto text-slate-300" />
          <h4 className="mt-3 text-sm font-bold text-slate-700">Không có công việc nào trong mục này</h4>
          <p className="mt-1 text-xs text-slate-400">
            Tất cả công việc đã được xử lý hoặc chưa phát sinh thêm yêu cầu bảo trì mới.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {filteredItems.map((item) => {
            const statusMeta = STATUS_META[item.status] || STATUS_META.REPORTED;
            const severityMeta = SEVERITY_META[item.severity] || SEVERITY_META.MEDIUM;

            return (
              <div
                key={item.id}
                className="flex flex-col justify-between rounded-3xl border border-slate-200 bg-white p-5 shadow-xs transition-all hover:border-emerald-300 hover:shadow-xs"
              >
                <div>
                  {/* Top Line */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-base font-extrabold font-mono text-slate-900">PO {item.poCode}</span>
                      <p className="text-xs font-semibold text-slate-500 mt-0.5">
                        {item.team?.name || "Tổ"} · {item.productionLine?.name || "Chuyền"} ({item.area?.name || "Xưởng"})
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${severityMeta.bg} ${severityMeta.text}`}>
                        {severityMeta.label}
                      </span>
                      <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${statusMeta.bg} ${statusMeta.text}`}>
                        {statusMeta.label}
                      </span>
                    </div>
                  </div>

                  {/* Problem Description */}
                  <p className="mt-3 text-xs font-bold text-slate-800 leading-relaxed">
                    {item.description}
                  </p>

                  {/* Root Cause & Solution */}
                  {item.rootCause && (
                    <div className="mt-3 rounded-2xl bg-emerald-50/70 border border-emerald-200/70 p-3 text-xs space-y-1">
                      <p className="text-emerald-950">
                        <span className="font-bold">🌿 Nguyên nhân gốc:</span> {item.rootCause}
                      </p>
                      {item.solution && (
                        <p className="text-blue-950">
                          <span className="font-bold">✅ Đề xuất giải pháp:</span> {item.solution}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Bottom Action Footer */}
                <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
                  <div className="text-[11px] text-slate-500">
                    {item.task?.assignee ? (
                      <span className="font-semibold text-slate-700">
                        KTV phụ trách: <strong className="text-[#005A36]">{item.task.assignee.name}</strong>
                      </span>
                    ) : (
                      <span className="text-amber-700 font-semibold">Chưa có người nhận</span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {isDeptHead && item.status === "ROOT_CAUSE_FOUND" && (
                      <button
                        onClick={() => openAssignDialog(item)}
                        className="flex items-center gap-1.5 rounded-xl bg-indigo-700 px-3.5 py-1.5 text-xs font-bold text-white shadow-2xs hover:bg-indigo-800"
                      >
                        <UserCheck size={13} />
                        <span>Giao việc KTV</span>
                      </button>
                    )}

                    {isMaintenance && item.task?.status === "PENDING" && item.task?.assigneeId === currentUser?.id && (
                      <button
                        onClick={() => handleQuickAccept(item.task!.id)}
                        className="flex items-center gap-1.5 rounded-xl bg-[#005A36] px-3.5 py-1.5 text-xs font-bold text-white shadow-2xs hover:bg-[#00472A]"
                      >
                        <CheckCircle2 size={13} />
                        <span>Nhận việc ngay</span>
                      </button>
                    )}

                    <Link
                      href={`/portal/issues/${item.id}`}
                      className="flex items-center gap-1 rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-[#005A36] hover:text-white transition-all"
                    >
                      <span>Chi tiết 8 bước</span>
                      <ChevronRight size={13} />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ─── ASSIGN TECH MODAL (FOR DEPT HEAD) ─────────────────────────────── */}
      {assignIssue && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs animate-in fade-in-50">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Phân Công Kỹ Thuật Viên Sửa Chữa</h3>
                <p className="text-xs text-slate-500">PO: {assignIssue.poCode}</p>
              </div>
              <button onClick={() => setAssignIssue(null)} className="rounded-full p-1 text-slate-400 hover:bg-slate-100">
                <X size={16} />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <p className="text-xs font-semibold text-slate-700">Chọn kỹ thuật viên trong xưởng:</p>
              <div className="max-h-60 overflow-y-auto space-y-2">
                {technicians.length === 0 ? (
                  <p className="py-4 text-center text-xs text-slate-400">Không tìm thấy kỹ thuật viên bảo trì trong xưởng này.</p>
                ) : (
                  technicians.map((t) => {
                    const isSelected = selectedTech?.id === t.id;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setSelectedTech(t)}
                        className={`w-full flex items-center justify-between p-3 rounded-2xl border text-left transition-all ${
                          isSelected
                            ? "border-[#005A36] bg-emerald-50/80 shadow-2xs"
                            : "border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        <div>
                          <p className="text-xs font-bold text-slate-900">{t.name}</p>
                          <p className="text-[10px] text-slate-500">Mã NV: {t.employeeCode}</p>
                        </div>
                        {isSelected && <Check size={14} className="text-[#005A36]" />}
                      </button>
                    );
                  })
                )}
              </div>

              {assignError && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-2 text-xs font-semibold text-rose-700">
                  {assignError}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setAssignIssue(null)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  disabled={!selectedTech || assigning}
                  onClick={handleAssignSubmit}
                  className="flex items-center gap-1.5 rounded-xl bg-[#005A36] px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#00472A] disabled:opacity-50"
                >
                  {assigning ? <RefreshCw size={13} className="animate-spin" /> : <Send size={13} />}
                  <span>Xác nhận giao việc</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
