"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { SearchInput } from "@/components/search-input";
import { DetailModal, DetailRow } from "@/components/detail-modal";

type CategoryType = "AREA" | "PRODUCTION_LINE" | "TEAM" | "FAILURE_CATEGORY" | "PART_CATEGORY";

// AREA/PRODUCTION_LINE/TEAM dùng chung /api/categories?type=...; FAILURE_CATEGORY và
// PART_CATEGORY là 2 bảng riêng (IssueFailureCategory, PartCategory) nên có API riêng.
const TYPE_OPTIONS: { value: CategoryType; label: string }[] = [
  { value: "AREA", label: "Khu vực / Xưởng" },
  { value: "PRODUCTION_LINE", label: "Chuyền" },
  { value: "TEAM", label: "Tổ" },
  { value: "FAILURE_CATEGORY", label: "Danh mục lỗi" },
  { value: "PART_CATEGORY", label: "Danh mục linh kiện" },
];

type Category = {
  id: string;
  name: string;
  colorHex?: string | null;
  order: number;
  parentAreaId?: string | null;
  parentArea?: { id: string; name: string } | null;
  parentLineId?: string | null;
  parentLine?: { id: string; name: string; parentAreaId?: string | null } | null;
};

const emptyForm = { name: "", colorHex: "#1F5C3F", order: 0, parentAreaId: "", parentLineId: "" };

// Chuyền cần chọn Khu vực/Xưởng. Tổ cần chọn cả Khu vực/Xưởng lẫn Chuyền (Tổ nằm trong Chuyền,
// Chuyền nằm trong Khu vực) — phân cấp 3 tầng: Xưởng > Chuyền > Tổ.
function needsParentArea(type: CategoryType) {
  return type === "TEAM" || type === "PRODUCTION_LINE";
}
function needsParentLine(type: CategoryType) {
  return type === "TEAM";
}

function apiBase(type: CategoryType) {
  if (type === "FAILURE_CATEGORY") return "/api/issue-failure-categories";
  if (type === "PART_CATEGORY") return "/api/part-categories";
  return "/api/categories";
}

function usesCategoryTypeQuery(type: CategoryType) {
  return type === "AREA" || type === "PRODUCTION_LINE" || type === "TEAM";
}

const VALID_TYPES = TYPE_OPTIONS.map((o) => o.value);
const EXTRA_COLS = { PRODUCTION_LINE: 1, TEAM: 2 } as Record<string, number>;

export default function CategoriesPage() {
  return (
    <Suspense>
      <CategoriesPageInner />
    </Suspense>
  );
}

function CategoriesPageInner() {
  const searchParams = useSearchParams();
  const typeParam = searchParams.get("type");
  const type: CategoryType =
    typeParam && (VALID_TYPES as string[]).includes(typeParam) ? (typeParam as CategoryType) : "AREA";
  const [items, setItems] = useState<Category[]>([]);
  const [areas, setAreas] = useState<Category[]>([]);
  const [lines, setLines] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [viewing, setViewing] = useState<Category | null>(null);
  const [search, setSearch] = useState("");

  const extraCols = EXTRA_COLS[type] || 0;

  const filtered = useMemo(() => {
    if (!Array.isArray(items)) return [];
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((c) => c && c.name && c.name.toLowerCase().includes(q));
  }, [items, search]);

  // Chuyền hiển thị trong combobox chọn của form Tổ — lọc theo đúng Khu vực đang chọn trong form.
  const linesInSelectedArea = useMemo(
    () => (Array.isArray(lines) ? lines.filter((l) => l && l.parentAreaId === form.parentAreaId) : []),
    [lines, form.parentAreaId],
  );

  async function load() {
    setLoading(true);
    try {
      const url = usesCategoryTypeQuery(type) ? `${apiBase(type)}?type=${type}` : apiBase(type);
      const res = await fetch(url);
      const data = res.ok ? await res.json() : [];
      setItems(Array.isArray(data) ? data : []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    setSearch("");
    if (needsParentArea(type)) {
      fetch("/api/categories?type=AREA")
        .then((r) => (r.ok ? r.json() : []))
        .then((d) => setAreas(Array.isArray(d) ? d : []))
        .catch(() => setAreas([]));
    }
    if (needsParentLine(type)) {
      fetch("/api/categories?type=PRODUCTION_LINE")
        .then((r) => (r.ok ? r.json() : []))
        .then((d) => setLines(Array.isArray(d) ? d : []))
        .catch(() => setLines([]));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type]);


  function openCreate() {
    setEditing(null);
    setForm({ ...emptyForm, order: items.length });
    setError(null);
    setShowForm(true);
  }

  function openEdit(c: Category) {
    setEditing(c);
    setForm({
      name: c.name,
      colorHex: c.colorHex || "#1F5C3F",
      order: c.order,
      parentAreaId: c.parentAreaId || "",
      parentLineId: c.parentLineId || "",
    });
    setError(null);
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const body: Record<string, unknown> = usesCategoryTypeQuery(type)
      ? {
          type,
          name: form.name,
          order: form.order,
          colorHex: form.colorHex,
          ...(needsParentArea(type) ? { parentAreaId: form.parentAreaId } : {}),
          ...(needsParentLine(type) ? { parentLineId: form.parentLineId } : {}),
        }
      : { name: form.name, order: form.order };

    const url = editing ? `${apiBase(type)}/${editing.id}` : apiBase(type);
    const method = editing ? "PUT" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
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
    if (!confirm("Xoá mục này?")) return;
    const res = await fetch(`${apiBase(type)}/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json();
      alert(data.error || "Không thể xoá");
      return;
    }
    await load();
  }

  return (
    <div>
      <PageHeader title={`Danh mục — ${TYPE_OPTIONS.find((o) => o.value === type)?.label}`}>
        <SearchInput value={search} onChange={setSearch} placeholder="Tìm theo tên..." />
        <button
          onClick={openCreate}
          className="whitespace-nowrap rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark"
        >
          + Thêm mục
        </button>
      </PageHeader>

      <div className="overflow-hidden rounded-xl bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-100 text-slate-600">
            <tr>
              <th className="px-4 py-3">Thứ tự</th>
              <th className="px-4 py-3">Tên</th>
              {needsParentLine(type) && <th className="px-4 py-3">Chuyền</th>}
              {needsParentArea(type) && <th className="px-4 py-3">Khu vực / Xưởng</th>}
              <th className="px-4 py-3 text-right">Hành động</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td className="px-4 py-4 text-slate-400" colSpan={3 + extraCols}>
                  Đang tải...
                </td>
              </tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr>
                <td className="px-4 py-4 text-slate-400" colSpan={3 + extraCols}>
                  {items.length === 0 ? "Chưa có mục nào" : "Không tìm thấy mục phù hợp"}
                </td>
              </tr>
            )}
            {filtered.map((c) => (
              <tr
                key={c.id}
                onClick={() => setViewing(c)}
                className="cursor-pointer border-t border-slate-100 hover:bg-slate-50"
              >
                <td className="px-4 py-3">{c.order}</td>
                <td className="px-4 py-3">{c.name}</td>
                {needsParentLine(type) && (
                  <td className="px-4 py-3 text-slate-600">{c.parentLine?.name || "—"}</td>
                )}
                {needsParentArea(type) && (
                  <td className="px-4 py-3 text-slate-600">{c.parentArea?.name || "—"}</td>
                )}
                <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                  <button onClick={() => openEdit(c)} className="mr-3 text-slate-600 hover:underline">
                    Sửa
                  </button>
                  <button onClick={() => handleDelete(c.id)} className="text-red-600 hover:underline">
                    Xoá
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/30 p-4">
          <form onSubmit={handleSubmit} className="w-full max-w-md rounded-xl bg-white p-6 shadow-lg">
            <h2 className="mb-4 text-lg font-semibold text-slate-800">
              {editing ? "Sửa mục" : "Thêm mục"} — {TYPE_OPTIONS.find((o) => o.value === type)?.label}
            </h2>

            <label className="mb-1 block text-sm font-medium text-slate-700">Tên</label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="mb-3 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              required
            />

            {usesCategoryTypeQuery(type) && (
              <>
                <label className="mb-1 block text-sm font-medium text-slate-700">Màu hiển thị</label>
                <input
                  type="color"
                  value={form.colorHex}
                  onChange={(e) => setForm({ ...form, colorHex: e.target.value })}
                  className="mb-3 h-10 w-full rounded-md border border-slate-300 px-1 py-1"
                />
              </>
            )}

            {needsParentArea(type) && (
              <>
                <label className="mb-1 block text-sm font-medium text-slate-700">Khu vực / Xưởng</label>
                <select
                  value={form.parentAreaId}
                  onChange={(e) => setForm({ ...form, parentAreaId: e.target.value, parentLineId: "" })}
                  className="mb-3 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  required
                >
                  <option value="">— Chọn khu vực/xưởng —</option>
                  {areas.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </>
            )}

            {needsParentLine(type) && (
              <>
                <label className="mb-1 block text-sm font-medium text-slate-700">Chuyền</label>
                <select
                  value={form.parentLineId}
                  onChange={(e) => setForm({ ...form, parentLineId: e.target.value })}
                  className="mb-3 w-full rounded-md border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100"
                  required
                  disabled={!form.parentAreaId}
                >
                  <option value="">
                    {form.parentAreaId ? "— Chọn chuyền —" : "— Chọn khu vực/xưởng trước —"}
                  </option>
                  {linesInSelectedArea.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
                </select>
              </>
            )}

            <label className="mb-1 block text-sm font-medium text-slate-700">Thứ tự hiển thị</label>
            <input
              type="number"
              value={form.order}
              onChange={(e) => setForm({ ...form, order: Number(e.target.value) })}
              className="mb-3 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />

            {error && (
              <p className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
            )}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="rounded-md px-4 py-2 text-sm text-slate-600 hover:bg-slate-100"
              >
                Huỷ
              </button>
              <button
                type="submit"
                className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark"
              >
                Lưu
              </button>
            </div>
          </form>
        </div>
      )}

      {viewing && (
        <DetailModal
          title={viewing.name}
          onClose={() => setViewing(null)}
          footer={
            <button
              onClick={() => {
                setViewing(null);
                openEdit(viewing);
              }}
              className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark"
            >
              Sửa
            </button>
          }
        >
          <DetailRow label="Thứ tự hiển thị" value={viewing.order} />
        </DetailModal>
      )}
    </div>
  );
}
