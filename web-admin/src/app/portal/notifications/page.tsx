"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bell,
  Search,
  CheckCircle2,
  Clock,
  Wrench,
  AlertTriangle,
  RefreshCw,
  ChevronRight,
  ShieldAlert,
  Inbox,
  Filter,
} from "lucide-react";
import { NotificationItem, portalApi } from "@/lib/portal-client";

function timeAgo(iso: string) {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "vừa xong";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} phút trước`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  return `${days} ngày trước`;
}

const KIND_META: Record<
  string,
  { icon: string; title: string; badgeBg: string; badgeColor: string }
> = {
  NEED_INVESTIGATE: {
    icon: "🔍",
    title: "Cần điều tra 5M+1E",
    badgeBg: "bg-amber-100 text-amber-900 border-amber-300",
    badgeColor: "text-amber-800",
  },
  NEED_ROOT_CAUSE: {
    icon: "🧩",
    title: "Cần chốt nguyên nhân gốc",
    badgeBg: "bg-blue-100 text-blue-900 border-blue-300",
    badgeColor: "text-blue-800",
  },
  NEED_ASSIGN: {
    icon: "📋",
    title: "Cần giao việc bảo trì",
    badgeBg: "bg-indigo-100 text-indigo-900 border-indigo-300",
    badgeColor: "text-indigo-800",
  },
  TASK_ASSIGNED: {
    icon: "🛠️",
    title: "CẦN TRỢ GIÚP (Việc bảo trì mới)",
    badgeBg: "bg-rose-100 text-rose-900 border-rose-300",
    badgeColor: "text-rose-800",
  },
  TASK_ACCEPTED: {
    icon: "✅",
    title: "Bảo trì đã nhận việc",
    badgeBg: "bg-cyan-100 text-cyan-900 border-cyan-300",
    badgeColor: "text-cyan-800",
  },
  NEED_REPAIR_REVIEW: {
    icon: "🔎",
    title: "Xác nhận sửa chữa đạt yêu cầu?",
    badgeBg: "bg-amber-100 text-amber-900 border-amber-300",
    badgeColor: "text-amber-800",
  },
  NEED_VERIFY: {
    icon: "⏳",
    title: "Đang theo dõi — Đóng vấn đề?",
    badgeBg: "bg-purple-100 text-purple-900 border-purple-300",
    badgeColor: "text-purple-800",
  },
  TASK_DONE_INFO: {
    icon: "🔧",
    title: "Bảo trì đã hoàn thành sửa chữa",
    badgeBg: "bg-emerald-100 text-emerald-900 border-emerald-300",
    badgeColor: "text-emerald-800",
  },
  ISSUE_RESOLVED: {
    icon: "🎉",
    title: "Sự cố đã hoàn thành",
    badgeBg: "bg-emerald-100 text-emerald-900 border-emerald-300",
    badgeColor: "text-emerald-800",
  },
};

export default function NotificationsPage() {
  const router = useRouter();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>("ALL");

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const data = await portalApi.listNotifications();
      setItems(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const filteredItems = items.filter((item) => {
    if (filterType === "ALL") return true;
    return item.kind === filterType;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="rounded-3xl border border-slate-200/80 bg-gradient-to-r from-emerald-950 via-slate-900 to-slate-900 p-6 text-white shadow-lg">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-md">
              <Bell className="text-lime-300" size={26} />
            </div>
            <div>
              <h1 className="text-lg font-bold sm:text-xl">Trung Tâm Thông Báo</h1>
              <p className="text-xs text-emerald-200">
                Các sự kiện, yêu cầu hành động và tiến độ xử lý liên quan đến vai trò của bạn
              </p>
            </div>
          </div>

          <button
            onClick={loadNotifications}
            className="flex items-center gap-1.5 self-start rounded-xl border border-white/15 bg-white/10 px-3.5 py-2 text-xs font-semibold text-white hover:bg-white/20 sm:self-auto"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            <span>Làm mới</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto border-b border-slate-200 pb-3 text-xs font-medium scrollbar-none">
        {[
          { key: "ALL", label: `Tất cả (${items.length})` },
          { key: "NEED_INVESTIGATE", label: "Cần điều tra 5M+1E" },
          { key: "TASK_ASSIGNED", label: "Cần trợ giúp bảo trì" },
          { key: "NEED_ASSIGN", label: "Cần phân công" },
          { key: "NEED_REPAIR_REVIEW", label: "Cần xác nhận sửa" },
          { key: "NEED_VERIFY", label: "Theo dõi 3-48h" },
          { key: "ISSUE_RESOLVED", label: "Hoàn thành" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilterType(tab.key)}
            className={`whitespace-nowrap rounded-xl px-3.5 py-1.5 transition-all ${
              filterType === tab.key
                ? "bg-emerald-900 text-white font-bold shadow-xs"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Notifications List */}
      {loading ? (
        <div className="flex min-h-[30vh] items-center justify-center text-slate-400">
          <RefreshCw size={24} className="animate-spin text-emerald-800" />
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-white py-16 text-center">
          <Inbox size={36} className="mx-auto text-slate-300" />
          <h4 className="mt-3 text-sm font-bold text-slate-700">Chưa có thông báo nào</h4>
          <p className="mt-1 text-xs text-slate-400">
            Hộp thông báo của bạn hiện đang trống.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredItems.map((item) => {
            const meta = KIND_META[item.kind] || {
              icon: "🔔",
              title: "Thông báo mới",
              badgeBg: "bg-slate-100 text-slate-800 border-slate-300",
              badgeColor: "text-slate-700",
            };

            const issue = "issue" in item ? item.issue : item.task.issue;
            const task = "task" in item ? item.task : null;

            return (
              <Link
                key={item.id}
                href={`/portal/issues/${issue.id}`}
                className="group flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-4.5 transition-all hover:border-emerald-500 hover:shadow-md sm:flex-row sm:items-center"
              >
                <div className="flex items-start gap-3.5">
                  <span className="text-2xl">{meta.icon}</span>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-sm font-bold text-slate-900 group-hover:text-emerald-800">
                        {meta.title}
                      </h4>
                      <span className={`rounded-md border px-2 py-0.5 text-[10px] font-bold ${meta.badgeBg}`}>
                        PO {issue.poCode}
                      </span>
                    </div>

                    <p className="mt-1 text-xs text-slate-600">
                      {issue.description}
                    </p>

                    <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                      <span>Vị trí: {issue.team?.name || "-"} / {issue.productionLine?.name || "-"} ({issue.area?.name || "-"})</span>
                      <span>·</span>
                      <span>Báo bởi: {issue.reporter?.name || "N/A"}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between gap-3 border-t border-slate-100 pt-2.5 sm:mt-0 sm:border-0 sm:pt-0">
                  <span className="text-xs font-semibold text-slate-400">
                    {timeAgo(item.createdAt)}
                  </span>
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-slate-500 group-hover:bg-emerald-800 group-hover:text-white transition-colors">
                    <ChevronRight size={16} />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
