"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  Home,
  Bell,
  Wrench,
  BarChart3,
  BookOpen,
  LogOut,

  ChevronDown,
  ChevronUp,
  Sparkles,
  Shield,
  Menu,
  X,
  Plus,
  Clock,
  AlertCircle,
  FlaskConical,
  CheckCircle2,
  AlertTriangle,
  Key,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  Building2,
  HeartHandshake,
  HelpCircle,
} from "lucide-react";
import { BrandMark, BrandLogoFull } from "@/components/brand-logo";
import {
  UserPublic,

  UserRole,
  ROLE_LABELS,
  ROLE_BADGE_COLORS,
  portalApi,
  QualityIssue,
} from "@/lib/portal-client";

const TEST_ACCOUNTS = [
  { code: "NV001", role: "OPERATOR", name: "Nguyễn Văn An", title: "Cán Bộ Sản Xuất", shift: "Ca 1", icon: "👷" },
  { code: "QA001", role: "QA", name: "Trần Thị QA", title: "Kiểm Soát Chất Lượng", shift: "Chuyên trách QA", icon: "🔍" },
  { code: "LL001", role: "LINE_LEADER", name: "Lê Văn Trưởng Line", title: "Trưởng Chuyền May 1", shift: "Quản lý Chuyền", icon: "👔" },
  { code: "CN001", role: "TECHNOLOGY", name: "Phạm Văn Công Nghệ", title: "Kỹ Thuật Quy Trình", shift: "Phòng Kỹ Thuật", icon: "⚙️" },
  { code: "TP001", role: "DEPARTMENT_HEAD", name: "Hoàng Văn Trưởng Phòng", title: "Trưởng Phòng Cơ Điện", shift: "Khối Bảo Trì", icon: "📋" },
  { code: "BT001", role: "MAINTENANCE", name: "Đỗ Văn Bảo Trì", title: "Kỹ Thuật Viên Bảo Trì", shift: "Trực ca máy", icon: "🔧" },
  { code: "GD001", role: "DIRECTOR", name: "Vũ Thị Giám Đốc", title: "Ban Giám Đốc Nhà Máy", shift: "Điều hành chung", icon: "🏢" },
  { code: "ADM001", role: "ADMIN", name: "Quản trị viên", title: "Hệ Thống TBS", shift: "Quản trị hệ thống", icon: "🛡️" },
];

export default function PortalShell({
  user,
  children,
}: {
  user: UserPublic;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [statusMenuOpen, setStatusMenuOpen] = useState(true);
  const [roleSwitcherOpen, setRoleSwitcherOpen] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [switchingRole, setSwitchingRole] = useState(false);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [issues, setIssues] = useState<QualityIssue[]>([]);
  const [currentTime, setCurrentTime] = useState("");

  // Live Digital Clock
  useEffect(() => {
    function updateClock() {
      const now = new Date();
      const timeStr = now.toTimeString().split(" ")[0];
      const day = String(now.getDate()).padStart(2, "0");
      const month = String(now.getMonth() + 1).padStart(2, "0");
      const year = now.getFullYear();
      setCurrentTime(`${timeStr} · ${day}/${month}/${year}`);
    }
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  const role = user.role as UserRole;
  const areaName = role === "DIRECTOR" ? "Toàn nhà máy" : user.area?.name || "Xưởng May 1";

  useEffect(() => {
    let mounted = true;
    function fetchLiveStats() {
      Promise.all([
        portalApi.listNotifications().catch(() => []),
        portalApi.listIssues().catch(() => []),
      ]).then(([notifs, issueList]) => {
        if (mounted) {
          setUnreadCount(notifs.length);
          setIssues(issueList);
        }
      });
    }
    fetchLiveStats();
    const timer = setInterval(fetchLiveStats, 4000);
    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, [pathname]);

  const countPending = issues.filter((i) => i.status === "REPORTED").length;
  const countInProgress = issues.filter(
    (i) => i.status === "INVESTIGATING" || i.status === "ROOT_CAUSE_FOUND"
  ).length;
  const countTrial = issues.filter((i) => i.status === "ASSIGNED" || i.status === "IN_PROGRESS").length;
  const countDone = issues.filter((i) => i.status === "DONE").length;
  const countSos = issues.filter((i) => i.severity === "URGENT").length;
  const totalStatusCount = issues.length;

  async function handleQuickSwitchRole(targetCode: string) {
    setSwitchingRole(true);
    try {
      const { signIn } = await import("next-auth/react");
      const res = await signIn("credentials", {
        employeeCode: targetCode,
        password: "123456",
        redirect: false,
      });
      if (res?.ok) {
        setRoleSwitcherOpen(false);
        if (targetCode === "ADM001") {
          router.push("/admin");
        } else {
          router.push("/portal");
        }
        router.refresh();
      }
    } catch {
      // ignore
    } finally {
      setSwitchingRole(false);
    }
  }

  return (
    <div className="flex min-h-screen bg-[#F7F9F8] text-slate-900 font-sans antialiased selection:bg-emerald-100 selection:text-emerald-900">
      {/* ─── 1. HUMAN & WARM LEFTBAR ──────────────────────────────────────── */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col border-r border-slate-200/80 bg-white shadow-[1px_0_10px_rgba(0,0,0,0.02)] transition-all duration-300 ${
          sidebarCollapsed ? "w-20" : "w-64"
        } hidden md:flex`}
      >
        {/* Brand Header */}
        <div className="flex h-16 items-center justify-between border-b border-slate-100 px-4">
          <div className="flex items-center overflow-hidden">
            {!sidebarCollapsed ? (
              <BrandLogoFull height={40} className="hover:opacity-90 transition-opacity" />
            ) : (
              <BrandMark size={32} />
            )}
          </div>
          <button
            onClick={() => setSidebarCollapsed((c) => !c)}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors ml-2 flex-shrink-0"
            title={sidebarCollapsed ? "Mở rộng menu" : "Thu gọn menu"}
          >
            {sidebarCollapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
          </button>
        </div>


        {/* Human Personal Profile Card */}
        {!sidebarCollapsed ? (
          <div className="p-3 border-b border-slate-100">
            <div className="rounded-2xl bg-gradient-to-br from-emerald-50/90 to-teal-50/50 p-3 border border-emerald-200/70 shadow-2xs">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-[#005A36] text-white font-bold text-xs shadow-2xs">
                  {user.name?.charAt(0) || "U"}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <p className="truncate text-xs font-bold text-slate-900">{user.name}</p>
                    <span className="h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-emerald-200" title="Đang trực ca" />
                  </div>
                  <p className="truncate text-[10.5px] text-slate-600 font-medium">
                    {ROLE_LABELS[role]} · {areaName}
                  </p>
                </div>
              </div>
              <div className="mt-2.5 flex items-center justify-between text-[10px] font-semibold text-[#005A36] border-t border-emerald-200/50 pt-1.5">
                <span>Mã NV: {user.employeeCode}</span>
                <span className="bg-emerald-100/90 px-1.5 py-0.2 rounded font-bold">Đang trong ca</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex justify-center p-3 border-b border-slate-100">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#005A36] text-white font-bold text-xs">
              {user.name?.charAt(0) || "U"}
            </div>
          </div>
        )}

        {/* Big Action CTA: Báo Cáo Vấn Đề */}
        <div className="p-3">
          <Link
            href="/portal?action=report"
            className={`flex items-center justify-center gap-2 rounded-xl bg-[#005A36] font-bold text-white shadow-xs hover:bg-[#00472A] active:scale-98 transition-all ${
              sidebarCollapsed ? "h-10 w-full p-0" : "py-2.5 px-3 text-xs"
            }`}
          >
            <Plus size={16} className="text-lime-300 flex-shrink-0" />
            {!sidebarCollapsed && <span className="tracking-wide font-extrabold text-[11.5px]">BÁO CÁO VẤN ĐỀ</span>}
          </Link>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 overflow-y-auto px-3 py-1 space-y-1">
          <Link
            href="/portal"
            className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold transition-colors ${
              pathname === "/portal"
                ? "bg-emerald-50 text-[#005A36] font-bold border border-emerald-200/60"
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            }`}
          >
            <Home size={15} className={pathname === "/portal" ? "text-[#005A36]" : "text-slate-400"} />
            {!sidebarCollapsed && <span>Trang chủ</span>}
          </Link>

          <Link
            href="/portal/work"
            className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold transition-colors ${
              pathname === "/portal/work"
                ? "bg-emerald-50 text-[#005A36] font-bold border border-emerald-200/60"
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            }`}
          >
            <Wrench size={15} className={pathname === "/portal/work" ? "text-[#005A36]" : "text-slate-400"} />
            {!sidebarCollapsed && <span>Nhiệm vụ &amp; Công việc</span>}
          </Link>

          <Link
            href="/portal/notifications"
            className={`flex items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold transition-colors ${
              pathname === "/portal/notifications"
                ? "bg-emerald-50 text-[#005A36] font-bold border border-emerald-200/60"
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Bell size={15} className={pathname === "/portal/notifications" ? "text-[#005A36]" : "text-slate-400"} />
              {!sidebarCollapsed && <span>Thông báo của bạn</span>}
            </div>
            {!sidebarCollapsed && unreadCount > 0 && (
              <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white shadow-2xs animate-pulse">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </Link>

          <Link
            href="/portal/library"
            className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold transition-colors ${
              pathname === "/portal/library"
                ? "bg-emerald-50 text-[#005A36] font-bold border border-emerald-200/60"
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            }`}
          >
            <BookOpen size={15} className={pathname === "/portal/library" ? "text-[#005A36]" : "text-slate-400"} />
            {!sidebarCollapsed && <span>Thư viện PO &amp; Lỗi</span>}
          </Link>

          <Link
            href="/portal/stats"
            className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold transition-colors ${
              pathname === "/portal/stats"
                ? "bg-emerald-50 text-[#005A36] font-bold border border-emerald-200/60"
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            }`}
          >
            <BarChart3 size={15} className={pathname === "/portal/stats" ? "text-[#005A36]" : "text-slate-400"} />
            {!sidebarCollapsed && <span>Top lỗi &amp; Thống kê</span>}
          </Link>


          {/* Phân loại trạng thái (Humanized Labels) */}
          {!sidebarCollapsed && (
            <div className="pt-3 border-t border-slate-100 mt-2">
              <button
                type="button"
                onClick={() => setStatusMenuOpen((o) => !o)}
                className="flex w-full items-center justify-between px-2 py-1 text-[11px] font-bold text-slate-500 uppercase tracking-wider hover:text-slate-800"
              >
                <span>Theo dõi tiến độ ({totalStatusCount})</span>
                {statusMenuOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              </button>

              {statusMenuOpen && (
                <div className="mt-1 space-y-0.5">
                  <Link
                    href="/portal?status=REPORTED"
                    className="flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-amber-500" />
                      <span>1. Chờ tiếp nhận</span>
                    </div>
                    <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-100 text-amber-900 text-[10px] font-bold px-1">
                      {countPending}
                    </span>
                  </Link>

                  <Link
                    href="/portal?status=INVESTIGATING"
                    className="flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-blue-500" />
                      <span>2. Đang phân tích 5M+1E</span>
                    </div>
                    <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-blue-100 text-blue-900 text-[10px] font-bold px-1">
                      {countInProgress}
                    </span>
                  </Link>

                  <Link
                    href="/portal?status=TRIAL_RUN"
                    className="flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-purple-500" />
                      <span>3. Chạy thử &amp; Theo dõi</span>
                    </div>
                    <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-purple-100 text-purple-900 text-[10px] font-bold px-1">
                      {countTrial}
                    </span>
                  </Link>

                  <Link
                    href="/portal?status=DONE"
                    className="flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-emerald-500" />
                      <span>4. Đã nghiệm thu xong</span>
                    </div>
                    <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-emerald-100 text-emerald-900 text-[10px] font-bold px-1">
                      {countDone}
                    </span>
                  </Link>

                  <Link
                    href="/portal?status=SOS_REQUESTED"
                    className="flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
                      <span>5. 🚨 Cứu trợ khẩn cấp (SOS)</span>
                    </div>
                    <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 text-white text-[10px] font-bold px-1">
                      {countSos}
                    </span>
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="border-t border-slate-100 p-3 space-y-1.5">
          {!sidebarCollapsed ? (
            <>
              <button
                type="button"
                onClick={() => setPasswordModalOpen(true)}
                className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <Key size={13} className="text-slate-400" />
                <span>Đổi mật khẩu</span>
              </button>

              <button
                type="button"
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors"
              >
                <LogOut size={13} />
                <span>Đăng xuất</span>
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="flex h-8 w-full items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600"
            >
              <LogOut size={15} />
            </button>
          )}
        </div>
      </aside>

      {/* ─── 2. MAIN WORKSPACE VIEWPORT ───────────────────────────────────── */}
      <div className={`flex flex-1 flex-col transition-all duration-300 ${sidebarCollapsed ? "md:pl-20" : "md:pl-64"}`}>
        {/* Top Navbar */}
        <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-slate-200/80 bg-white/95 px-4 backdrop-blur-md sm:px-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen((o) => !o)}
              className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100 md:hidden"
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>

            <div className="flex items-center gap-2">
              <span className="text-xs font-extrabold text-[#005A36]">HỆ THỐNG TBS GROUP</span>
              <span className="text-slate-300">/</span>
              <span className="text-xs font-medium text-slate-600">{areaName}</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {currentTime && (
              <div className="hidden sm:flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-mono text-slate-600">
                <Clock size={12} className="text-slate-400" />
                <span>{currentTime}</span>
              </div>
            )}

            <button
              onClick={() => setRoleSwitcherOpen(true)}
              className="flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-bold text-[#005A36] hover:bg-emerald-100 transition-colors"
            >
              <Sparkles size={13} className="text-emerald-700" />
              <span>Chuyển vai trò</span>
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>

      {/* Role Switcher Modal */}
      {roleSwitcherOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs animate-in fade-in-50">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl animate-in zoom-in-95">
            <div className="mb-3 flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-[#005A36]" />
                <h3 className="text-sm font-bold text-slate-900">Chuyển Đổi Nhanh Vai Trò Kiểm Thử</h3>
              </div>
              <button
                onClick={() => setRoleSwitcherOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                <X size={15} />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {TEST_ACCOUNTS.map((acc) => {
                const isCurrent = user.employeeCode === acc.code;
                return (
                  <button
                    key={acc.code}
                    disabled={switchingRole || isCurrent}
                    onClick={() => handleQuickSwitchRole(acc.code)}
                    className={`flex items-center gap-2.5 rounded-xl border p-2 text-left transition-all ${
                      isCurrent
                        ? "border-[#005A36] bg-emerald-50"
                        : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                    } disabled:opacity-75`}
                  >
                    <span className="text-xl">{acc.icon}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900">{acc.code}</span>
                        {isCurrent && <CheckCircle2 size={12} className="text-[#005A36]" />}
                      </div>
                      <p className="truncate text-xs font-medium text-slate-700">{acc.name}</p>
                      <p className="truncate text-[10px] text-slate-400">{acc.title} · {acc.shift}</p>
                    </div>
                  </button>
                );
              })}
            </div>

            {switchingRole && (
              <div className="mt-3 flex items-center justify-center gap-2 text-xs font-semibold text-[#005A36]">
                <Clock size={13} className="animate-spin" />
                <span>Đang chuyển đổi tài khoản...</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Password Modal */}
      {passwordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs animate-in fade-in-50">
          <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl animate-in zoom-in-95">
            <h3 className="text-sm font-bold text-slate-900 mb-1">Đổi Mật Khẩu</h3>
            <p className="text-xs text-slate-500 mb-3">Tài khoản {user.employeeCode}</p>
            <input
              type="password"
              placeholder="Nhập mật khẩu mới..."
              className="w-full rounded-lg border border-slate-200 p-2 text-xs focus:border-[#005A36] focus:outline-none mb-3"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setPasswordModalOpen(false)}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={() => {
                  alert("Mật khẩu đã được cập nhật!");
                  setPasswordModalOpen(false);
                }}
                className="rounded-lg bg-[#005A36] px-3.5 py-1.5 text-xs font-bold text-white hover:bg-[#00472A]"
              >
                Lưu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
