"use client";

import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { SearchInput } from "@/components/search-input";
import { DetailModal, DetailRow } from "@/components/detail-modal";
import {
  Sparkles,
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  X,
  Users,
  Building2,
  Trash2,
  Edit2,
  PlusCircle,
  FileText,
} from "lucide-react";
import { ParsedEmployee } from "@/app/api/admin/employees/ai-import/route";

type Role =
  | "ADMIN"
  | "OPERATOR"
  | "QA"
  | "LINE_LEADER"
  | "TECHNOLOGY"
  | "DEPARTMENT_HEAD"
  | "MAINTENANCE"
  | "DIRECTOR";

type Employee = {
  id: string;
  employeeCode: string;
  name: string;
  phone: string | null;
  role: Role;
  areaId: string | null;
  area: { id: string; name: string } | null;
};

type AreaOption = { id: string; name: string };

const emptyForm = {
  employeeCode: "",
  name: "",
  phone: "",
  password: "",
  role: "OPERATOR" as Employee["role"],
  areaId: "",
};

const roleLabel: Record<Role, string> = {
  ADMIN: "Admin",
  OPERATOR: "Nhân viên vận hành",
  QA: "QA",
  LINE_LEADER: "Trưởng line",
  TECHNOLOGY: "Công nghệ",
  DEPARTMENT_HEAD: "Trưởng phòng ban",
  MAINTENANCE: "Bảo trì",
  DIRECTOR: "Giám đốc",
};

const ROLE_OPTIONS: Role[] = [
  "OPERATOR",
  "QA",
  "LINE_LEADER",
  "TECHNOLOGY",
  "DEPARTMENT_HEAD",
  "MAINTENANCE",
  "DIRECTOR",
  "ADMIN",
];

const SAMPLE_CSV = `Mã NV,Họ và Tên,Vai Trò,Phân Xưởng,Phòng Ban,Số Điện Thoại
NV002,Phan Văn Hậu,Vận hành,Xưởng A,Sản xuất,0911223344
QA002,Nguyễn Thị Mai,QA,Xưởng A,Phòng QA,0922334455
LL002,Trần Quốc Toản,Trưởng line,Xưởng A,Chuyền 2,0933445566
CN002,Lê Hoàng Nam,Công nghệ,Xưởng A,Phòng Kỹ thuật,0944556677
BT002,Vũ Đức Trọng,Bảo trì,Xưởng A,Phòng Cơ điện,0955667788`;

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [areas, setAreas] = useState<AreaOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [viewing, setViewing] = useState<Employee | null>(null);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<Employee["role"] | "ALL">("ALL");

  // ─── AI IMPORT STATE ──────────────────────────────────────────────────────
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiStep, setAiStep] = useState<"INPUT" | "PREVIEW" | "SUCCESS">("INPUT");
  const [aiContent, setAiContent] = useState("");
  const [aiParsing, setAiParsing] = useState(false);
  const [aiCommitting, setAiCommitting] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [parsedEmployees, setParsedEmployees] = useState<ParsedEmployee[]>([]);
  const [importStats, setImportStats] = useState<{
    createdCount: number;
    updatedCount: number;
    totalCount: number;
    message: string;
  } | null>(null);

  const filteredEmployees = useMemo(() => {
    if (!Array.isArray(employees)) return [];
    const q = search.trim().toLowerCase();
    return employees.filter((e) => {
      if (!e || typeof e !== "object") return false;
      const matchesSearch =
        !q ||
        (e.employeeCode && e.employeeCode.toLowerCase().includes(q)) ||
        (e.name && e.name.toLowerCase().includes(q)) ||
        (e.phone && e.phone.toLowerCase().includes(q));
      const matchesRole = roleFilter === "ALL" || e.role === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [employees, search, roleFilter]);

  async function load() {
    setLoading(true);
    try {
      const [empRes, areasRes] = await Promise.all([
        fetch("/api/employees"),
        fetch("/api/categories?type=AREA"),
      ]);
      const empData = empRes.ok ? await empRes.json() : [];
      const areasData = areasRes.ok ? await areasRes.json() : [];
      setEmployees(Array.isArray(empData) ? empData : []);
      setAreas(Array.isArray(areasData) ? areasData : []);
    } catch {
      setEmployees([]);
      setAreas([]);
    } finally {
      setLoading(false);
    }
  }


  useEffect(() => {
    load();
  }, []);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setError(null);
    setShowForm(true);
  }

  function openEdit(e: Employee) {
    setEditing(e);
    setForm({
      employeeCode: e.employeeCode,
      name: e.name,
      phone: e.phone || "",
      password: "",
      role: e.role,
      areaId: e.areaId || "",
    });
    setError(null);
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const url = editing ? `/api/employees/${editing.id}` : "/api/employees";
    const method = editing ? "PUT" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Có lỗi xảy ra");
      return;
    }
    setShowForm(false);
    await load();
  }

  async function handleDelete(id: string) {
    if (!confirm("Xoá nhân viên này? Hành động không thể hoàn tác.")) return;
    await fetch(`/api/employees/${id}`, { method: "DELETE" });
    await load();
  }

  // ─── AI IMPORT HANDLERS ───────────────────────────────────────────────────
  function openAiImport() {
    setAiStep("INPUT");
    setAiContent("");
    setAiError(null);
    setParsedEmployees([]);
    setImportStats(null);
    setShowAiModal(true);
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAiError(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        setAiContent(text);
      }
    };
    reader.onerror = () => {
      setAiError("Không thể đọc tệp tin. Vui lòng thử lại.");
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  async function handleAiParse() {
    if (!aiContent.trim()) {
      setAiError("Vui lòng tải tệp hoặc dán danh sách nhân sự.");
      return;
    }
    setAiParsing(true);
    setAiError(null);
    try {
      const res = await fetch("/api/admin/employees/ai-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "parse", content: aiContent }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Lỗi khi phân tích dữ liệu");
      }
      setParsedEmployees(data.employees || []);
      setAiStep("PREVIEW");
    } catch (err: unknown) {
      setAiError(err instanceof Error ? err.message : "Không thể phân tích danh sách.");
    } finally {
      setAiParsing(false);
    }
  }

  async function handleAiCommit() {
    if (parsedEmployees.length === 0) return;
    setAiCommitting(true);
    setAiError(null);
    try {
      const res = await fetch("/api/admin/employees/ai-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "commit", employees: parsedEmployees }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Lỗi khi cập nhật vào cơ sở dữ liệu");
      }
      setImportStats(data);
      setAiStep("SUCCESS");
      await load();
    } catch (err: unknown) {
      setAiError(err instanceof Error ? err.message : "Lỗi khi lưu dữ liệu");
    } finally {
      setAiCommitting(false);
    }
  }

  function handleRemoveParsedRow(index: number) {
    setParsedEmployees((prev) => prev.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Quản Lý Nhân Sự">
        <SearchInput value={search} onChange={setSearch} placeholder="Tìm theo mã NV, tên, SĐT..." />
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value as Employee["role"] | "ALL")}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 focus:border-emerald-600 focus:outline-none"
        >
          <option value="ALL">Tất cả vai trò</option>
          {ROLE_OPTIONS.map((r) => (
            <option key={r} value={r}>
              {roleLabel[r]}
            </option>
          ))}
        </select>

        {/* AI Import Button */}
        <button
          onClick={openAiImport}
          className="flex items-center gap-1.5 whitespace-nowrap rounded-xl bg-gradient-to-r from-emerald-700 to-emerald-800 px-4 py-2 text-xs font-bold text-white shadow-sm hover:from-emerald-800 hover:to-emerald-900 active:scale-95 transition-all"
        >
          <Sparkles size={14} className="text-lime-300" />
          <span>Import Bằng AI</span>
        </button>

        {/* Manual Add Button */}
        <button
          onClick={openCreate}
          className="flex items-center gap-1.5 whitespace-nowrap rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-50 hover:text-emerald-800 active:scale-95 transition-all"
        >
          <PlusCircle size={14} />
          <span>+ Thêm thủ công</span>
        </button>
      </PageHeader>

      {/* Employees Table */}
      <div className="overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-xs">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-slate-100 bg-slate-50/80 font-bold uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-5 py-3.5">Mã NV</th>
              <th className="px-5 py-3.5">Họ và Tên</th>
              <th className="px-5 py-3.5">Số Điện Thoại</th>
              <th className="px-5 py-3.5">Vai Trò</th>
              <th className="px-5 py-3.5">Khu Vực / Xưởng</th>
              <th className="px-5 py-3.5 text-right">Thao Tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading && (
              <tr>
                <td className="px-5 py-8 text-center text-slate-400" colSpan={6}>
                  <RefreshCw size={20} className="mx-auto animate-spin text-emerald-800" />
                  <p className="mt-2 font-medium">Đang tải danh sách nhân sự...</p>
                </td>
              </tr>
            )}
            {!loading && filteredEmployees.length === 0 && (
              <tr>
                <td className="px-5 py-8 text-center text-slate-400" colSpan={6}>
                  {employees.length === 0 ? "Chưa có nhân viên nào trong hệ thống." : "Không tìm thấy nhân sự phù hợp."}
                </td>
              </tr>
            )}
            {filteredEmployees.map((emp) => (
              <tr
                key={emp.id}
                onClick={() => setViewing(emp)}
                className="cursor-pointer transition-colors hover:bg-emerald-50/40"
              >
                <td className="px-5 py-3.5 font-bold font-mono text-emerald-900">{emp.employeeCode}</td>
                <td className="px-5 py-3.5 font-bold text-slate-900">{emp.name}</td>
                <td className="px-5 py-3.5 text-slate-600">{emp.phone || "—"}</td>
                <td className="px-5 py-3.5">
                  <span className="rounded-md border border-slate-200 bg-slate-100 px-2 py-0.5 font-bold text-slate-800 text-[11px]">
                    {roleLabel[emp.role]}
                  </span>
                </td>
                <td className="px-5 py-3.5 text-slate-600">{emp.area?.name || "—"}</td>
                <td className="px-5 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => openEdit(emp)}
                    className="mr-3 font-semibold text-slate-600 hover:text-emerald-800"
                  >
                    Sửa
                  </button>
                  <button
                    onClick={() => handleDelete(emp.id)}
                    className="font-semibold text-rose-600 hover:text-rose-800"
                  >
                    Xoá
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ─── AI IMPORT MODAL ──────────────────────────────────────────────── */}
      {showAiModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs animate-in fade-in-50">
          <div className="w-full max-w-3xl rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl animate-in zoom-in-95 max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-800 shadow-xs">
                  <Sparkles size={22} className="text-emerald-700" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Import & Cập Nhật Nhân Sự Bằng AI
                  </h3>
                  <p className="text-xs text-slate-500">
                    AI tự động nhận diện mã nhân viên, vai trò, xưởng, phòng ban và liên kết tài khoản
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAiModal(false)}
                className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto py-4 space-y-4">
              {/* STEP 1: INPUT FILE / TEXT */}
              {aiStep === "INPUT" && (
                <div className="space-y-4">
                  {/* File Upload Box */}
                  <label className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-emerald-300 bg-emerald-50/50 p-6 text-center cursor-pointer hover:bg-emerald-50 hover:border-emerald-500 transition-colors">
                    <UploadCloud size={32} className="text-emerald-700" />
                    <span className="mt-2 text-xs font-bold text-emerald-900">
                      Nhấn để tải lên file Excel (.xlsx, .csv) hoặc tệp danh sách (.txt, .json)
                    </span>
                    <span className="mt-0.5 text-[11px] text-slate-500">
                      Hỗ trợ mọi định dạng bảng danh sách nhân sự không giới hạn số lượng
                    </span>
                    <input
                      type="file"
                      accept=".xlsx,.xls,.csv,.txt,.json,.tsv"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>

                  {/* Textarea or Paste */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-bold text-slate-700">
                        Hoặc Dán trực tiếp văn bản / bảng danh sách vào đây:
                      </label>
                      <button
                        type="button"
                        onClick={() => setAiContent(SAMPLE_CSV)}
                        className="text-[11px] font-bold text-emerald-800 hover:underline"
                      >
                        + Dùng dữ liệu mẫu
                      </button>
                    </div>
                    <textarea
                      rows={8}
                      value={aiContent}
                      onChange={(e) => setAiContent(e.target.value)}
                      placeholder="Dán nội dung bảng danh sách nhân sự tại đây..."
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-3.5 text-xs text-slate-900 font-mono focus:border-emerald-600 focus:bg-white focus:outline-none"
                    />
                  </div>

                  {aiError && (
                    <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 flex items-center gap-2">
                      <AlertTriangle size={15} />
                      <span>{aiError}</span>
                    </div>
                  )}
                </div>
              )}

              {/* STEP 2: PREVIEW PARSED RESULTS */}
              {aiStep === "PREVIEW" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between rounded-2xl bg-emerald-50 border border-emerald-200/80 p-3.5">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 size={18} className="text-emerald-700" />
                      <span className="text-xs font-bold text-emerald-950">
                        AI đã nhận diện thành công {parsedEmployees.length} nhân sự
                      </span>
                    </div>
                    <span className="text-xs text-emerald-800 font-semibold">
                      Kiểm tra bảng bên dưới trước khi lưu
                    </span>
                  </div>

                  <div className="max-h-72 overflow-y-auto rounded-2xl border border-slate-200 bg-white">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 font-bold text-slate-600 sticky top-0 border-b border-slate-100">
                        <tr>
                          <th className="px-3.5 py-2.5">Trạng thái</th>
                          <th className="px-3.5 py-2.5">Mã NV</th>
                          <th className="px-3.5 py-2.5">Họ và Tên</th>
                          <th className="px-3.5 py-2.5">Vai Trò</th>
                          <th className="px-3.5 py-2.5">Xưởng</th>
                          <th className="px-3.5 py-2.5">Phòng Ban</th>
                          <th className="px-3.5 py-2.5 text-right">Xoá</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {parsedEmployees.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="px-3.5 py-2">
                              <span
                                className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold ${
                                  item.status === "NEW"
                                    ? "bg-emerald-100 text-emerald-800"
                                    : "bg-amber-100 text-amber-800"
                                }`}
                              >
                                {item.status === "NEW" ? "Tạo mới" : "Cập nhật"}
                              </span>
                            </td>
                            <td className="px-3.5 py-2 font-mono font-bold text-slate-900">
                              {item.employeeCode}
                            </td>
                            <td className="px-3.5 py-2 font-semibold text-slate-800">{item.name}</td>
                            <td className="px-3.5 py-2">
                              <span className="rounded bg-slate-100 px-1.5 py-0.5 font-semibold text-slate-700">
                                {roleLabel[item.role]}
                              </span>
                            </td>
                            <td className="px-3.5 py-2 text-slate-600">{item.areaName || "—"}</td>
                            <td className="px-3.5 py-2 text-slate-600">{item.departmentName || "—"}</td>
                            <td className="px-3.5 py-2 text-right">
                              <button
                                onClick={() => handleRemoveParsedRow(idx)}
                                className="text-slate-400 hover:text-rose-600"
                                title="Bỏ dòng này"
                              >
                                <Trash2 size={14} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {aiError && (
                    <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 flex items-center gap-2">
                      <AlertTriangle size={15} />
                      <span>{aiError}</span>
                    </div>
                  )}
                </div>
              )}

              {/* STEP 3: SUCCESS SUMMARY */}
              {aiStep === "SUCCESS" && importStats && (
                <div className="py-6 text-center space-y-4">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-800 shadow-md">
                    <CheckCircle2 size={36} />
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-slate-900">Import Nhân Sự Hoàn Tất!</h4>
                    <p className="mt-1 text-xs text-slate-500">{importStats.message}</p>
                  </div>
                  <div className="mx-auto grid max-w-sm grid-cols-2 gap-3 rounded-2xl bg-slate-50 p-4 border border-slate-200">
                    <div className="text-center">
                      <span className="text-2xl font-extrabold text-emerald-700">
                        {importStats.createdCount}
                      </span>
                      <p className="text-xs text-slate-500">Tạo mới</p>
                    </div>
                    <div className="text-center">
                      <span className="text-2xl font-extrabold text-amber-700">
                        {importStats.updatedCount}
                      </span>
                      <p className="text-xs text-slate-500">Cập nhật</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer Actions */}
            <div className="border-t border-slate-100 pt-4 flex justify-between items-center">
              {aiStep === "INPUT" && (
                <>
                  <button
                    type="button"
                    onClick={() => setShowAiModal(false)}
                    className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                  >
                    Đóng
                  </button>
                  <button
                    type="button"
                    disabled={aiParsing || !aiContent.trim()}
                    onClick={handleAiParse}
                    className="flex items-center gap-2 rounded-xl bg-emerald-800 px-6 py-2.5 text-xs font-bold text-white shadow-md hover:bg-emerald-900 disabled:opacity-60 transition-all"
                  >
                    {aiParsing ? (
                      <>
                        <RefreshCw size={14} className="animate-spin" />
                        <span>AI Đang Phân Tích...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles size={14} className="text-lime-300" />
                        <span>Bắt Đầu Phân Tích Bằng AI</span>
                      </>
                    )}
                  </button>
                </>
              )}

              {aiStep === "PREVIEW" && (
                <>
                  <button
                    type="button"
                    onClick={() => setAiStep("INPUT")}
                    className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                  >
                    ← Quay lại tải lại file
                  </button>
                  <button
                    type="button"
                    disabled={aiCommitting || parsedEmployees.length === 0}
                    onClick={handleAiCommit}
                    className="flex items-center gap-2 rounded-xl bg-emerald-800 px-6 py-2.5 text-xs font-bold text-white shadow-md hover:bg-emerald-900 disabled:opacity-60 transition-all"
                  >
                    {aiCommitting ? (
                      <>
                        <RefreshCw size={14} className="animate-spin" />
                        <span>Đang Cập Nhật Hệ Thống...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={14} />
                        <span>Xác Nhận & Cập Nhật ({parsedEmployees.length} Nhân Sự)</span>
                      </>
                    )}
                  </button>
                </>
              )}

              {aiStep === "SUCCESS" && (
                <div className="w-full flex justify-end">
                  <button
                    type="button"
                    onClick={() => setShowAiModal(false)}
                    className="rounded-xl bg-emerald-800 px-6 py-2.5 text-xs font-bold text-white hover:bg-emerald-900"
                  >
                    Hoàn Tất & Đóng
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── MANUAL CREATE / EDIT MODAL ────────────────────────────────────── */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs animate-in fade-in-50">
          <form
            onSubmit={handleSubmit}
            className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl animate-in zoom-in-95"
          >
            <h2 className="mb-4 text-base font-bold text-slate-900">
              {editing ? "Sửa Thông Tin Nhân Viên" : "Thêm Nhân Viên Mới"}
            </h2>

            <label className="mb-1 block text-xs font-bold text-slate-700">Mã nhân viên</label>
            <input
              value={form.employeeCode}
              onChange={(e) => setForm({ ...form, employeeCode: e.target.value })}
              className="mb-3 w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs text-slate-900 focus:border-emerald-600 focus:outline-none"
              required
            />

            <label className="mb-1 block text-xs font-bold text-slate-700">Họ và tên</label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="mb-3 w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs text-slate-900 focus:border-emerald-600 focus:outline-none"
              required
            />

            <label className="mb-1 block text-xs font-bold text-slate-700">Số điện thoại</label>
            <input
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="mb-3 w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs text-slate-900 focus:border-emerald-600 focus:outline-none"
            />

            <label className="mb-1 block text-xs font-bold text-slate-700">
              Mật khẩu {editing && "(để trống nếu không đổi)"}
            </label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="mb-3 w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs text-slate-900 focus:border-emerald-600 focus:outline-none"
              required={!editing}
            />

            <label className="mb-1 block text-xs font-bold text-slate-700">Vai trò</label>
            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value as Employee["role"] })}
              className="mb-3 w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs text-slate-900 focus:border-emerald-600 focus:outline-none"
            >
              {ROLE_OPTIONS.map((r) => (
                <option key={r} value={r}>
                  {roleLabel[r]}
                </option>
              ))}
            </select>

            <label className="mb-1 block text-xs font-bold text-slate-700">
              Khu vực / Xưởng
            </label>
            <select
              value={form.areaId}
              onChange={(e) => setForm({ ...form, areaId: e.target.value })}
              className="mb-4 w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs text-slate-900 focus:border-emerald-600 focus:outline-none"
            >
              <option value="">-- Chưa chọn --</option>
              {areas.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>

            {error && (
              <p className="mb-3 rounded-xl bg-rose-50 border border-rose-200 p-2.5 text-xs text-rose-600 font-semibold">{error}</p>
            )}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Huỷ
              </button>
              <button
                type="submit"
                className="rounded-xl bg-emerald-800 px-5 py-2 text-xs font-bold text-white hover:bg-emerald-900 shadow-sm"
              >
                Lưu
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ─── DETAIL VIEW MODAL ────────────────────────────────────────────── */}
      {viewing && (
        <DetailModal
          title={viewing.name}
          subtitle={viewing.employeeCode}
          onClose={() => setViewing(null)}
          footer={
            <button
              onClick={() => {
                setViewing(null);
                openEdit(viewing);
              }}
              className="rounded-xl bg-emerald-800 px-5 py-2 text-xs font-bold text-white hover:bg-emerald-900 shadow-sm"
            >
              Sửa
            </button>
          }
        >
          <DetailRow label="Mã nhân viên" value={viewing.employeeCode} />
          <DetailRow label="Số điện thoại" value={viewing.phone} />
          <DetailRow label="Vai trò" value={roleLabel[viewing.role]} />
          <DetailRow label="Khu vực / Xưởng" value={viewing.area?.name} />
        </DetailModal>
      )}
    </div>
  );
}
