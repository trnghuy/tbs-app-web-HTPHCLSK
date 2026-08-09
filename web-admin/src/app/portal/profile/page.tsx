"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { signOut, signIn } from "next-auth/react";
import {
  User as UserIcon,
  Shield,
  KeyRound,
  LogOut,
  Sparkles,
  CheckCircle2,
  RefreshCw,
  Factory,
  Phone,
  Hash,
  Layers,
  Wrench,
  Check,
} from "lucide-react";
import { UserPublic, UserRole, portalApi, ROLE_LABELS, ROLE_BADGE_COLORS } from "@/lib/portal-client";

const TEST_ACCOUNTS = [
  { code: "NV001", role: "OPERATOR", name: "Nguyễn Văn Vận Hành", icon: "👷", desc: "Báo cáo sự cố, tra cứu PO" },
  { code: "QA001", role: "QA", name: "Trần Thị QA", icon: "🔍", desc: "Điều tra 5M+1E, AI 5 Whys" },
  { code: "LL001", role: "LINE_LEADER", name: "Lê Văn Trưởng Line", icon: "👔", desc: "Tổng hợp nguyên nhân, xác nhận & theo dõi" },
  { code: "CN001", role: "TECHNOLOGY", name: "Phạm Văn Công Nghệ", icon: "⚙️", desc: "Điều tra 5M+1E kỹ thuật" },
  { code: "TP001", role: "DEPARTMENT_HEAD", name: "Hoàng Văn Trưởng Phòng", icon: "📋", desc: "Giao việc bảo trì cùng xưởng" },
  { code: "BT001", role: "MAINTENANCE", name: "Đỗ Văn Bảo Trì", icon: "🔧", desc: "Nhận việc, bấm giờ, báo cáo sửa chữa" },
  { code: "GD001", role: "DIRECTOR", name: "Vũ Thị Giám Đốc", icon: "🏢", desc: "Toàn nhà máy, xử lý SOS & báo cáo" },
  { code: "ADM001", role: "ADMIN", name: "Quản trị viên", icon: "🛡️", desc: "Quản lý danh mục & nhân sự" },
];

export default function ProfilePage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<UserPublic | null>(null);
  const [loading, setLoading] = useState(true);

  // Password change state
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPass, setChangingPass] = useState(false);
  const [passMessage, setPassMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Role switch state
  const [switchingRole, setSwitchingRole] = useState(false);

  const loadProfile = useCallback(async () => {
    try {
      setLoading(true);
      const res = await portalApi.getMe();
      if (res?.user) setCurrentUser(res.user);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (!oldPassword || !newPassword) {
      setPassMessage({ type: "error", text: "Vui lòng điền mật khẩu hiện tại và mật khẩu mới." });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPassMessage({ type: "error", text: "Mật khẩu xác nhận không khớp." });
      return;
    }

    setChangingPass(true);
    setPassMessage(null);
    try {
      await portalApi.changePassword(oldPassword, newPassword);
      setPassMessage({ type: "success", text: "Đổi mật khẩu thành công!" });
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: unknown) {
      setPassMessage({ type: "error", text: err instanceof Error ? err.message : "Không thể đổi mật khẩu" });
    } finally {
      setChangingPass(false);
    }
  }

  async function handleSwitchRole(code: string) {
    setSwitchingRole(true);
    try {
      const res = await signIn("credentials", {
        employeeCode: code,
        password: "123456",
        redirect: false,
      });
      if (res?.ok) {
        if (code === "ADM001") {
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

  if (loading || !currentUser) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-slate-400">
        <RefreshCw size={24} className="animate-spin text-emerald-800" />
      </div>
    );
  }

  const role = currentUser.role as UserRole;
  const roleBadge = ROLE_BADGE_COLORS[role] || ROLE_BADGE_COLORS.OPERATOR;

  return (
    <div className="space-y-6">
      {/* Profile Header Card */}
      <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-emerald-700 to-emerald-950 text-2xl font-bold text-white shadow-md">
              {currentUser.name?.charAt(0) || "U"}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900">{currentUser.name}</h1>
                <span className={`rounded-md border px-2.5 py-0.5 text-xs font-bold ${roleBadge.bg} ${roleBadge.text} ${roleBadge.border}`}>
                  {ROLE_LABELS[role]}
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Mã nhân viên: <span className="font-semibold text-slate-700">{currentUser.employeeCode}</span> · {role === "DIRECTOR" ? "Toàn nhà máy" : currentUser.area?.name || "Xưởng A"}
              </p>
            </div>
          </div>

          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex items-center gap-1.5 self-start rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100 sm:self-auto"
          >
            <LogOut size={15} />
            <span>Đăng xuất</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column: Role Switcher & Account Details */}
        <div className="space-y-6 lg:col-span-7">
          {/* Quick 1-Click Role Switcher */}
          <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="text-emerald-700" size={20} />
                <h2 className="text-sm font-bold text-slate-900">
                  Chuyển Đổi Nhanh Vai Trò Kiểm Thử (8 Roles)
                </h2>
              </div>
              <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800">
                Test 1-Chạm
              </span>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              Nhấp vào vai trò bất kỳ để đăng nhập nhanh với mật khẩu mặc định (123456) và kiểm thử luồng nghiệp vụ:
            </p>

            <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {TEST_ACCOUNTS.map((acc) => {
                const isCurrent = currentUser.employeeCode === acc.code;
                return (
                  <button
                    key={acc.code}
                    disabled={switchingRole || isCurrent}
                    onClick={() => handleSwitchRole(acc.code)}
                    className={`flex items-start gap-3 rounded-2xl border p-3 text-left transition-all ${
                      isCurrent
                        ? "border-emerald-600 bg-emerald-50/70 shadow-xs"
                        : "border-slate-200 hover:border-slate-300 hover:bg-slate-50 active:scale-98"
                    } disabled:opacity-75`}
                  >
                    <span className="text-2xl">{acc.icon}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900">{acc.code}</span>
                        {isCurrent ? (
                          <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-700">
                            <CheckCircle2 size={12} /> Đang dùng
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-500">{ROLE_LABELS[acc.role as UserRole]}</span>
                        )}
                      </div>
                      <p className="truncate text-xs font-medium text-slate-700">{acc.name}</p>
                      <p className="mt-0.5 line-clamp-1 text-[10px] text-slate-400">{acc.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Account Information Card */}
          <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs">
            <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3">
              Thông Tin Tài Khoản
            </h2>
            <div className="mt-4 divide-y divide-slate-100 text-xs">
              <div className="flex items-center justify-between py-2.5">
                <span className="text-slate-500">Mã nhân viên</span>
                <span className="font-bold text-slate-900">{currentUser.employeeCode}</span>
              </div>
              <div className="flex items-center justify-between py-2.5">
                <span className="text-slate-500">Họ và tên</span>
                <span className="font-bold text-slate-900">{currentUser.name}</span>
              </div>
              <div className="flex items-center justify-between py-2.5">
                <span className="text-slate-500">Số điện thoại</span>
                <span className="font-semibold text-slate-700">{currentUser.phone || "Chưa cập nhật"}</span>
              </div>
              <div className="flex items-center justify-between py-2.5">
                <span className="text-slate-500">Khu vực phân xưởng</span>
                <span className="font-bold text-emerald-800">
                  {role === "DIRECTOR" ? "Toàn nhà máy (Không giới hạn)" : currentUser.area?.name || "Xưởng A"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Change Password */}
        <div className="space-y-6 lg:col-span-5">
          <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <KeyRound className="text-emerald-700" size={20} />
              <h2 className="text-sm font-bold text-slate-900">Đổi Mật Khẩu</h2>
            </div>

            <form onSubmit={handleChangePassword} className="mt-4 space-y-3.5">
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">Mật khẩu hiện tại</label>
                <input
                  type="password"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  placeholder="Mật khẩu hiện tại (mặc định 123456)"
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs text-slate-800 focus:border-emerald-600 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">Mật khẩu mới</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Nhập mật khẩu mới"
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs text-slate-800 focus:border-emerald-600 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">Xác nhận mật khẩu mới</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Nhập lại mật khẩu mới"
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs text-slate-800 focus:border-emerald-600 focus:outline-none"
                  required
                />
              </div>

              {passMessage && (
                <div
                  className={`rounded-xl p-3 text-xs ${
                    passMessage.type === "success"
                      ? "border border-emerald-300 bg-emerald-50 text-emerald-800"
                      : "border border-rose-300 bg-rose-50 text-rose-700"
                  }`}
                >
                  {passMessage.text}
                </div>
              )}

              <button
                type="submit"
                disabled={changingPass}
                className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl bg-emerald-800 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-900 disabled:opacity-60"
              >
                {changingPass ? <RefreshCw size={14} className="animate-spin" /> : <KeyRound size={14} />}
                <span>Cập nhật mật khẩu</span>
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
