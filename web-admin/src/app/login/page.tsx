"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Eye, EyeOff, ShieldCheck, UserCheck, Sparkles, Factory, CheckCircle2 } from "lucide-react";
import { BrandMark } from "@/components/brand-logo";

const TEST_ACCOUNTS = [
  { code: "NV001", role: "Nhân viên vận hành", name: "Nguyễn Văn Vận Hành", icon: "👷", desc: "Báo cáo sự cố, tra cứu PO" },
  { code: "QA001", role: "QA", name: "Trần Thị QA", icon: "🔍", desc: "Điều tra 5M+1E, AI 5 Whys" },
  { code: "LL001", role: "Trưởng line", name: "Lê Văn Trưởng Line", icon: "👔", desc: "Tổng hợp nguyên nhân, xác nhận & theo dõi" },
  { code: "CN001", role: "Công nghệ", name: "Phạm Văn Công Nghệ", icon: "⚙️", desc: "Điều tra 5M+1E kỹ thuật" },
  { code: "TP001", role: "Trưởng phòng ban", name: "Hoàng Văn Trưởng Phòng", icon: "📋", desc: "Giao việc bảo trì cùng xưởng" },
  { code: "BT001", role: "Bảo trì", name: "Đỗ Văn Bảo Trì", icon: "🔧", desc: "Nhận việc, bấm giờ, báo cáo sửa chữa" },
  { code: "GD001", role: "Giám đốc", name: "Vũ Thị Giám Đốc", icon: "🏢", desc: "Toàn nhà máy, xử lý SOS & báo cáo" },
  { code: "ADM001", role: "Admin", name: "Quản trị viên", icon: "🛡️", desc: "Quản lý danh mục & nhân sự" },
];

export default function LoginPage() {
  const router = useRouter();
  const [employeeCode, setEmployeeCode] = useState("");
  const [password, setPassword] = useState("123456");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedRoleCode, setSelectedRoleCode] = useState<string | null>(null);

  function handleSelectAccount(acc: typeof TEST_ACCOUNTS[0]) {
    setEmployeeCode(acc.code);
    setPassword("123456");
    setSelectedRoleCode(acc.code);
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await signIn("credentials", {
        employeeCode: employeeCode.trim(),
        password: password.trim(),
        redirect: false,
      });

      if (res?.error) {
        setLoading(false);
        setError("Tên đăng nhập hoặc mật khẩu không chính xác.");
        return;
      }

      const tokenRes = await fetch("/api/portal/token");
      if (tokenRes.ok) {
        const data = await tokenRes.json();
        if (data?.user?.role === "ADMIN") {
          router.push("/admin");
        } else {
          router.push("/portal");
        }
      } else {
        if (employeeCode.toUpperCase().startsWith("ADM")) {
          router.push("/admin");
        } else {
          router.push("/portal");
        }
      }
      router.refresh();
    } catch {
      setError("Đã xảy ra lỗi khi đăng nhập. Vui lòng thử lại.");
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-x-hidden bg-[#f9f8f6] px-4 py-8 text-warm-900">
      {/* Warm ambient glow */}
      <div className="pointer-events-none absolute -top-60 -left-40 h-[32rem] w-[32rem] rounded-full bg-emerald-200/25 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-60 -right-40 h-[32rem] w-[32rem] rounded-full bg-lime-200/15 blur-3xl" />

      <div className="relative z-10 grid w-full max-w-5xl gap-8 lg:grid-cols-12">
        {/* Left: Login Card */}
        <div className="flex flex-col justify-center rounded-3xl border border-[#e8e4de]/80 bg-white p-6 shadow-[0_10px_28px_rgba(0,90,54,0.08),0_3px_8px_rgba(0,90,54,0.04)] sm:p-8 lg:col-span-6">
          <div className="mb-7 flex items-center gap-3.5">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-emerald p-2 shadow-[0_2px_8px_rgba(0,90,54,0.15)] ring-2 ring-brand-lighter/30">
              <BrandMark size={32} />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-warm-900 sm:text-2xl">
                TBS HTPH-CLSK
              </h1>
              <p className="text-xs font-semibold text-brand-emerald">Hệ thống Phản hồi & Xử lý Sự cố Chất lượng</p>
            </div>
          </div>

          <div className="mb-6 rounded-2xl border border-brand-lighter/60 bg-brand-soft/80 p-4">
            <div className="flex items-center gap-2 text-xs font-bold text-brand-darkest">
              <Sparkles size={14} className="text-brand-emerald" />
              <span>Cổng đăng nhập tập trung cho toàn bộ 8 vai trò</span>
            </div>
            <p className="mt-1 text-xs text-warm-600 leading-relaxed">
              Hệ thống tự động chuyển bạn đến giao diện quản trị hoặc phân xưởng tương ứng với quyền hạn của bạn.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-warm-700">
                Mã đăng nhập (Mã nhân viên)
              </label>
              <input
                id="employeeCode"
                value={employeeCode}
                onChange={(e) => setEmployeeCode(e.target.value)}
                className="w-full rounded-xl border border-[#e8e4de] bg-[#f9f8f6] px-4 py-3 text-sm text-warm-900 placeholder:text-warm-400 transition-all duration-150 focus:border-brand-mid focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-lighter"
                placeholder="VD: NV001, QA001, LL001..."
                required
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-warm-700">
                Mật khẩu
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-[#e8e4de] bg-[#f9f8f6] px-4 py-3 pr-11 text-sm text-warm-900 placeholder:text-warm-400 transition-all duration-150 focus:border-brand-mid focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-lighter"
                  placeholder="Nhập mật khẩu"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-xl p-1 text-warm-400 hover:text-warm-700 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <p className="mt-1.5 text-[11px] text-warm-500">
                Mật khẩu mặc định: <span className="font-bold text-brand-emerald">123456</span>
              </p>
            </div>

            {error && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
                {error}
              </div>
            )}

            <button
              id="loginSubmitBtn"
              type="submit"
              disabled={loading}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-emerald py-3.5 text-sm font-bold text-white shadow-[0_2px_8px_rgba(0,90,54,0.15)] hover:bg-[#0a4d2e] active:scale-[0.98] disabled:opacity-60 transition-all duration-150"
            >
              {loading ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>Đang đăng nhập...</span>
                </>
              ) : (
                <>
                  <UserCheck size={18} />
                  <span>Đăng Nhập Hệ Thống</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Right: Quick Role Switcher */}
        <div className="flex flex-col justify-center rounded-3xl border border-[#e8e4de]/80 bg-white p-6 shadow-[0_10px_28px_rgba(0,90,54,0.08),0_3px_8px_rgba(0,90,54,0.04)] sm:p-8 lg:col-span-6">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Factory className="text-brand-emerald" size={19} />
              <h2 className="text-sm font-bold uppercase tracking-[0.1em] text-warm-900">
                Tài khoản Test Nhanh
              </h2>
            </div>
            <span className="rounded-full bg-brand-soft px-2.5 py-0.5 text-[11px] font-bold text-brand-emerald ring-1 ring-brand-lighter/50">
              8 Vai trò
            </span>
          </div>
          <p className="mb-4 text-xs text-warm-500">
            Bấm vào bất kỳ vai trò nào để tự động điền mã đăng nhập và kiểm thử trọn vẹn luồng nghiệp vụ 8 bước:
          </p>

          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {TEST_ACCOUNTS.map((acc) => {
              const isSelected = employeeCode === acc.code || selectedRoleCode === acc.code;
              return (
                <button
                  key={acc.code}
                  type="button"
                  onClick={() => handleSelectAccount(acc)}
                  className={`group relative flex items-start gap-3 rounded-2xl border p-3 text-left transition-all duration-150 active:scale-[0.98] ${
                    isSelected
                      ? "border-brand-mid bg-brand-soft/80 shadow-[0_1px_3px_rgba(0,90,54,0.05)]"
                      : "border-[#e8e4de] bg-white hover:border-brand-lighter hover:bg-[#f9f8f6]"
                  }`}
                >
                  <span className="text-2xl">{acc.icon}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-bold text-warm-900">{acc.code}</span>
                      {isSelected ? (
                        <CheckCircle2 size={14} className="text-brand-emerald shrink-0" />
                      ) : (
                        <span className="text-[10px] text-warm-400">{acc.role}</span>
                      )}
                    </div>
                    <p className="truncate text-[11px] font-semibold text-warm-700">{acc.name}</p>
                    <p className="mt-0.5 line-clamp-1 text-[10px] text-warm-400 group-hover:text-warm-500">
                      {acc.desc}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="mt-5 rounded-2xl border border-[#e8e4de]/70 bg-[#f9f8f6] p-3.5 text-[11px] text-warm-500 leading-relaxed">
            <div className="flex items-center gap-1.5 font-bold text-warm-700">
              <ShieldCheck size={14} className="text-brand-emerald" />
              <span>Dữ liệu mẫu đã được seed sẵn:</span>
            </div>
            <p className="mt-1">
              Khu vực: <span className="font-semibold text-warm-700">Xưởng A</span> &middot; Chuyền: <span className="font-semibold text-warm-700">Chuyền 1</span> &middot; Tổ: <span className="font-semibold text-warm-700">Tổ 1</span>. Mọi vai trò (trừ Admin và Giám đốc) đều thuộc cùng khu vực để test mượt mà từ đầu đến cuối.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
