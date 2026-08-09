"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard,
  Users,
  Building2,
  AlertTriangle,
  Tags,
  Menu,
  ExternalLink,
  LogOut,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Shield,
} from "lucide-react";
import { BrandMark, BrandLogoFull } from "@/components/brand-logo";

const categoryTypeItems = [
  { type: "AREA", label: "Khu vực / Xưởng" },
  { type: "PRODUCTION_LINE", label: "Chuyền" },
  { type: "TEAM", label: "Tổ" },
  { type: "FAILURE_CATEGORY", label: "Danh mục lỗi" },
  { type: "PART_CATEGORY", label: "Danh mục linh kiện" },
];

const navItems = [
  { href: "/admin", label: "Tổng quan", icon: LayoutDashboard },
  { href: "/admin/employees", label: "Nhân sự", icon: Users },
  { href: "/admin/departments", label: "Phòng ban & Nhà máy", icon: Building2 },
  { href: "/admin/issues", label: "Sự cố", icon: AlertTriangle },
  { label: "Danh mục", icon: Tags, children: categoryTypeItems },
];

export default function AdminShell({
  userName,
  children,
}: {
  userName: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeCategoryType = searchParams.get("type");
  const [collapsed, setCollapsed] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [categoriesOpen, setCategoriesOpen] = useState(pathname === "/admin/categories");

  return (
    <div className="flex min-h-screen bg-[#F7F9F8] text-slate-900 font-sans antialiased selection:bg-emerald-100 selection:text-emerald-900">
      {/* ─── Sidebar ─── */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col border-r border-slate-200/80 bg-white shadow-[1px_0_10px_rgba(0,0,0,0.02)] transition-all duration-300 ${
          collapsed ? "w-[72px]" : "w-64"
        } hidden md:flex`}
      >
        {/* Brand Header */}
        <div className="flex h-16 items-center justify-between border-b border-slate-100 px-4">
          <div className="flex items-center overflow-hidden">
            {!collapsed ? (
              <BrandLogoFull height={38} className="hover:opacity-90 transition-opacity" />
            ) : (
              <BrandMark size={30} />
            )}
          </div>
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors ml-2 flex-shrink-0"
            title={collapsed ? "Mở rộng menu" : "Thu gọn menu"}
          >
            {collapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
          </button>
        </div>

        {/* Admin Profile Card */}
        {!collapsed ? (
          <div className="p-3 border-b border-slate-100">
            <div className="rounded-2xl bg-gradient-to-br from-emerald-50/90 to-teal-50/50 p-3 border border-emerald-200/70">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-[#005A36] text-white font-bold text-xs shadow-sm">
                  {userName.charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <p className="truncate text-xs font-bold text-slate-900">{userName}</p>
                    <span className="h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-emerald-200" title="Online" />
                  </div>
                  <p className="truncate text-[10.5px] text-slate-600 font-medium">
                    Admin · Hệ Thống TBS
                  </p>
                </div>
              </div>
              <div className="mt-2.5 flex items-center justify-between text-[10px] font-semibold text-[#005A36] border-t border-emerald-200/50 pt-1.5">
                <span>Quản trị hệ thống</span>
                <span className="bg-emerald-100/90 px-1.5 py-0.2 rounded font-bold">Online</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex justify-center p-3 border-b border-slate-100">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#005A36] text-white font-bold text-xs shadow-sm">
              {userName.charAt(0)}
            </div>
          </div>
        )}

        {/* Navigation Label */}
        {!collapsed && (
          <div className="px-4 pt-4 pb-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
              Quản trị
            </p>
          </div>
        )}

        {/* Navigation Items */}
        <div className="flex-1 overflow-y-auto px-3 py-1 space-y-0.5">
          {navItems.map((item) => {
            const Icon = item.icon;

            if (item.children) {
              const parentActive = pathname === "/admin/categories";
              return (
                <div key={item.label}>
                  <button
                    onClick={() => setCategoriesOpen((o) => !o)}
                    className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold transition-colors ${
                      parentActive
                        ? "bg-emerald-50 text-[#005A36] font-bold border border-emerald-200/60"
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                  >
                    <Icon size={15} className={parentActive ? "text-[#005A36]" : "text-slate-400"} />
                    {!collapsed && (
                      <>
                        <span className="flex-1 text-left">{item.label}</span>
                        {categoriesOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                      </>
                    )}
                  </button>
                  {categoriesOpen && !collapsed && (
                    <div className="ml-4 mt-0.5 flex flex-col gap-0.5 border-l border-slate-200/80 pl-3">
                      {item.children.map((child) => {
                        const childActive = parentActive && activeCategoryType === child.type;
                        return (
                          <Link
                            key={child.type}
                            href={`/admin/categories?type=${child.type}`}
                            className={`rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition-colors ${
                              childActive
                                ? "bg-emerald-50/80 text-[#005A36]"
                                : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
                            }`}
                          >
                            {child.label}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold transition-colors ${
                  active
                    ? "bg-emerald-50 text-[#005A36] font-bold border border-emerald-200/60"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <Icon size={15} className={active ? "text-[#005A36]" : "text-slate-400"} />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-100 px-4 py-3 text-[10px] text-slate-400">
          {!collapsed && <>TBS Group &copy; {new Date().getFullYear()}</>}
        </div>
      </aside>

      {/* ─── Main Content ─── */}
      <div className={`flex min-h-screen flex-1 flex-col ${collapsed ? "md:ml-[72px]" : "md:ml-64"}`}>
        {/* Top Header Bar */}
        <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-slate-200/80 bg-white/95 backdrop-blur-sm px-5">
          <div className="flex items-center gap-3">
            {/* Mobile menu toggle */}
            <button
              onClick={() => setCollapsed((c) => !c)}
              className="rounded-xl p-1.5 text-slate-500 hover:bg-slate-100 md:hidden"
            >
              <Menu size={18} />
            </button>
            <div className="hidden md:flex items-center gap-2 text-xs font-bold text-slate-500">
              <Shield size={13} className="text-[#005A36]" />
              <span className="uppercase tracking-[0.12em]">Khu vực Quản trị Hệ thống</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/portal"
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-white hover:text-[#005A36] hover:border-emerald-200 transition-all active:scale-[0.97]"
            >
              <ExternalLink size={13} />
              <span>Portal</span>
            </Link>

            {/* User Menu */}
            <div className="relative">
              <button
                onClick={() => setMenuOpen((o) => !o)}
                className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 hover:bg-slate-50 transition-all active:scale-[0.97]"
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#005A36] text-[11px] font-bold text-white">
                  {userName.charAt(0)}
                </div>
                <span className="text-xs font-bold text-slate-800 hidden sm:inline">{userName}</span>
                <ChevronDown size={13} className="text-slate-400" />
              </button>

              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                  <div className="absolute right-0 top-full mt-2 w-48 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-[0_10px_28px_rgba(0,0,0,0.06)] z-50 animate-in">
                    <button
                      onClick={() => signOut({ callbackUrl: "/login" })}
                      className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-600 hover:bg-rose-50 hover:text-rose-700 transition-colors"
                    >
                      <LogOut size={14} />
                      <span>Đăng xuất</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-5 lg:p-6">{children}</main>

        {/* Footer */}
        <footer className="border-t border-slate-200/80 bg-white/80 px-6 py-3 text-center text-[11px] text-slate-400">
          <span className="font-bold text-[#005A36]">TBS Group</span> &middot; Hệ Thống Phản Hồi & Xử Lý Sự Cố Chất Lượng &middot; v1.0
        </footer>
      </div>
    </div>
  );
}
