"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Building2,
  Plus,
  Edit2,
  Trash2,
  Users,
  ShieldCheck,
  RefreshCw,
  X,
  Factory as FactoryIcon,
  Check,
} from "lucide-react";

type Factory = {
  id: string;
  code: string;
  name: string;
  address?: string | null;
  _count?: {
    areas: number;
    departments: number;
    users: number;
    issues: number;
  };
};

type DepartmentMember = {
  id: string;
  isHead: boolean;
  user: {
    id: string;
    employeeCode: string;
    name: string;
    role: string;
  };
};

type Department = {
  id: string;
  factoryId: string;
  factory: Factory;
  code: string;
  name: string;
  members: DepartmentMember[];
};

export default function DepartmentsAdminPage() {
  const [factories, setFactories] = useState<Factory[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [factoryModalOpen, setFactoryModalOpen] = useState(false);
  const [editingFactory, setEditingFactory] = useState<Factory | null>(null);
  const [factoryCode, setFactoryCode] = useState("");
  const [factoryName, setFactoryName] = useState("");
  const [factoryAddress, setFactoryAddress] = useState("");

  const [deptModalOpen, setDeptModalOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [deptFactoryId, setDeptFactoryId] = useState("");
  const [deptCode, setDeptCode] = useState("");
  const [deptName, setDeptName] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [fRes, dRes] = await Promise.all([
        fetch("/api/admin/factories").then((r) => r.json()),
        fetch("/api/admin/departments").then((r) => r.json()),
      ]);
      setFactories(Array.isArray(fRes) ? fRes : []);
      setDepartments(Array.isArray(dRes) ? dRes : []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Save Factory
  async function handleSaveFactory(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const url = editingFactory
        ? `/api/admin/factories/${editingFactory.id}`
        : "/api/admin/factories";
      const method = editingFactory ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: factoryCode,
          name: factoryName,
          address: factoryAddress,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Lỗi lưu nhà máy");
      }
      setFactoryModalOpen(false);
      await loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Lỗi lưu nhà máy");
    } finally {
      setSubmitting(false);
    }
  }

  // Save Department
  async function handleSaveDept(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const url = editingDept
        ? `/api/admin/departments/${editingDept.id}`
        : "/api/admin/departments";
      const method = editingDept ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          factoryId: deptFactoryId,
          code: deptCode,
          name: deptName,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Lỗi lưu phòng ban");
      }
      setDeptModalOpen(false);
      await loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Lỗi lưu phòng ban");
    } finally {
      setSubmitting(false);
    }
  }

  // Delete Factory
  async function handleDeleteFactory(id: string) {
    if (!confirm("Bạn có chắc muốn xóa nhà máy này?")) return;
    try {
      await fetch(`/api/admin/factories/${id}`, { method: "DELETE" });
      await loadData();
    } catch {
      // ignore
    }
  }

  // Delete Dept
  async function handleDeleteDept(id: string) {
    if (!confirm("Bạn có chắc muốn xóa phòng ban này?")) return;
    try {
      await fetch(`/api/admin/departments/${id}`, { method: "DELETE" });
      await loadData();
    } catch {
      // ignore
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Quản Lý Nhà Máy & Phòng Ban</h1>
          <p className="text-xs text-slate-500">
            Cấu trúc tổ chức multi-tenant: Nhà máy gốc → Phòng ban chức năng → Thành viên & Trưởng phòng
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setEditingFactory(null);
              setFactoryCode("");
              setFactoryName("");
              setFactoryAddress("");
              setError(null);
              setFactoryModalOpen(true);
            }}
            className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            <Plus size={15} />
            <span>Thêm Nhà Máy</span>
          </button>

          <button
            onClick={() => {
              setEditingDept(null);
              setDeptFactoryId(factories[0]?.id || "");
              setDeptCode("");
              setDeptName("");
              setError(null);
              setDeptModalOpen(true);
            }}
            disabled={factories.length === 0}
            className="flex items-center gap-1.5 rounded-lg bg-emerald-800 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-emerald-900 disabled:opacity-50"
          >
            <Plus size={15} />
            <span>Thêm Phòng Ban</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex min-h-[40vh] items-center justify-center text-slate-400">
          <RefreshCw size={24} className="animate-spin text-emerald-800" />
        </div>
      ) : (
        <>
          {/* Factories Overview Grid */}
          <div className="space-y-3">
            <h2 className="flex items-center gap-2 text-sm font-bold text-slate-800">
              <FactoryIcon size={17} className="text-emerald-800" />
              <span>Danh Sách Nhà Máy ({factories.length})</span>
            </h2>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {factories.map((f) => (
                <div
                  key={f.id}
                  className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-xs"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-900">
                        {f.code}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setEditingFactory(f);
                            setFactoryCode(f.code);
                            setFactoryName(f.name);
                            setFactoryAddress(f.address || "");
                            setError(null);
                            setFactoryModalOpen(true);
                          }}
                          className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          onClick={() => handleDeleteFactory(f.id)}
                          className="rounded-md p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>

                    <h3 className="mt-2 text-sm font-bold text-slate-900">{f.name}</h3>
                    {f.address && (
                      <p className="mt-1 text-xs text-slate-500">{f.address}</p>
                    )}
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-500">
                    <span>{f._count?.departments || 0} phòng ban</span>
                    <span>{f._count?.users || 0} nhân sự</span>
                    <span>{f._count?.issues || 0} sự cố</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Departments List */}
          <div className="mt-8 space-y-3">
            <h2 className="flex items-center gap-2 text-sm font-bold text-slate-800">
              <Building2 size={17} className="text-emerald-800" />
              <span>Danh Sách Phòng Ban Chức Năng ({departments.length})</span>
            </h2>

            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Nhà máy</th>
                    <th className="px-4 py-3 font-semibold">Mã phòng ban</th>
                    <th className="px-4 py-3 font-semibold">Tên phòng ban</th>
                    <th className="px-4 py-3 font-semibold">Trưởng phòng</th>
                    <th className="px-4 py-3 font-semibold">Thành viên</th>
                    <th className="px-4 py-3 text-right font-semibold">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {departments.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                        Chưa có phòng ban nào. Nhấn &quot;Thêm Phòng Ban&quot; để tạo mới.
                      </td>
                    </tr>
                  ) : (
                    departments.map((dept) => {
                      const headMember = dept.members.find((m) => m.isHead);
                      return (
                        <tr key={dept.id} className="hover:bg-slate-50/80">
                          <td className="px-4 py-3 font-medium text-slate-700">
                            {dept.factory?.name || dept.factoryId}
                          </td>
                          <td className="px-4 py-3">
                            <span className="rounded-md bg-slate-100 px-2 py-0.5 font-semibold text-slate-700">
                              {dept.code}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-bold text-slate-900">{dept.name}</td>
                          <td className="px-4 py-3">
                            {headMember ? (
                              <div className="flex items-center gap-1.5">
                                <ShieldCheck size={14} className="text-emerald-800" />
                                <span className="font-semibold text-slate-800">
                                  {headMember.user.name} ({headMember.user.employeeCode})
                                </span>
                              </div>
                            ) : (
                              <span className="text-slate-400 italic">Chưa chỉ định</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            <div className="flex items-center gap-1">
                              <Users size={13} className="text-slate-400" />
                              <span>{dept.members.length} nhân viên</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => {
                                  setEditingDept(dept);
                                  setDeptFactoryId(dept.factoryId);
                                  setDeptCode(dept.code);
                                  setDeptName(dept.name);
                                  setError(null);
                                  setDeptModalOpen(true);
                                }}
                                className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                              >
                                <Edit2 size={13} />
                              </button>
                              <button
                                onClick={() => handleDeleteDept(dept.id)}
                                className="rounded-md p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Modal Factory */}
      {factoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">
                {editingFactory ? "Sửa Nhà Máy" : "Thêm Nhà Máy Mới"}
              </h3>
              <button
                onClick={() => setFactoryModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveFactory} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700">Mã nhà máy *</label>
                <input
                  value={factoryCode}
                  onChange={(e) => setFactoryCode(e.target.value)}
                  placeholder="VD: KG1, KG2..."
                  required
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:border-emerald-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">Tên nhà máy *</label>
                <input
                  value={factoryName}
                  onChange={(e) => setFactoryName(e.target.value)}
                  placeholder="VD: Nhà máy TBS Kiên Giang 1..."
                  required
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:border-emerald-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">Địa chỉ</label>
                <input
                  value={factoryAddress}
                  onChange={(e) => setFactoryAddress(e.target.value)}
                  placeholder="Địa chỉ khu công nghiệp..."
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:border-emerald-600 focus:outline-none"
                />
              </div>

              {error && <p className="text-xs text-rose-600">{error}</p>}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setFactoryModalOpen(false)}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-1 rounded-lg bg-emerald-800 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-900 disabled:opacity-50"
                >
                  {submitting ? <RefreshCw size={13} className="animate-spin" /> : <Check size={13} />}
                  <span>Lưu</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Department */}
      {deptModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">
                {editingDept ? "Sửa Phòng Ban" : "Thêm Phòng Ban Mới"}
              </h3>
              <button
                onClick={() => setDeptModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveDept} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700">Thuộc Nhà máy *</label>
                <select
                  value={deptFactoryId}
                  onChange={(e) => setDeptFactoryId(e.target.value)}
                  required
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs focus:border-emerald-600 focus:outline-none"
                >
                  {factories.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name} ({f.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">Mã phòng ban *</label>
                <input
                  value={deptCode}
                  onChange={(e) => setDeptCode(e.target.value)}
                  placeholder="VD: DEPT_MAINTENANCE, DEPT_QA..."
                  required
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:border-emerald-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">Tên phòng ban *</label>
                <input
                  value={deptName}
                  onChange={(e) => setDeptName(e.target.value)}
                  placeholder="VD: Phòng Cơ Điện - Bảo Trì..."
                  required
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:border-emerald-600 focus:outline-none"
                />
              </div>

              {error && <p className="text-xs text-rose-600">{error}</p>}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setDeptModalOpen(false)}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-1 rounded-lg bg-emerald-800 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-900 disabled:opacity-50"
                >
                  {submitting ? <RefreshCw size={13} className="animate-spin" /> : <Check size={13} />}
                  <span>Lưu</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
