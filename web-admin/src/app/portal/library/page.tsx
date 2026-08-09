"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  BookOpen,
  Search,
  AlertTriangle,
  Layers,
  Sparkles,
  ChevronRight,
  TrendingUp,
  CheckCircle2,
  Clock,
  RefreshCw,
  FileText,
  Flame,
  Check,
  Filter,
  Tag,
  MapPin,
  HelpCircle,
  Copy,
  ExternalLink,
  ShieldCheck,
  SlidersHorizontal,
} from "lucide-react";
import { QualityIssue, portalApi, STATUS_META, SEVERITY_META, Category } from "@/lib/portal-client";

const QUICK_PO_PRESETS = ["PO-AREAB-TEST", "PO-SOS-TEST", "PO-SEV-3", "PO-ROOTCAUSE-TEST", "SK-GO-WALK"];

export default function DefectLibraryPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") || "";

  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [issues, setIssues] = useState<QualityIssue[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterTab, setFilterTab] = useState<"ALL" | "WITH_ROOT_CAUSE" | "REPEAT" | "RESOLVED">("ALL");
  const [selectedSeverity, setSelectedSeverity] = useState<string>("ALL");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleSearch = useCallback(async (query: string) => {
    setLoading(true);
    try {
      if (query.trim()) {
        const results = await portalApi.searchIssuesByPoCode(query.trim());
        setIssues(results);
      } else {
        const results = await portalApi.listIssues();
        setIssues(results);
      }
    } catch {
      setIssues([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    handleSearch(initialQuery);
  }, [handleSearch, initialQuery]);

  // Defect Category frequency map for detecting repeat issues
  const failureCategoryCounts: Record<string, number> = {};
  issues.forEach((item) => {
    const catName =
      item.failureCategory?.name ||
      (item.otherFailureNote ? `Khác: ${item.otherFailureNote}` : "Chung / Chưa phân loại");
    failureCategoryCounts[catName] = (failureCategoryCounts[catName] || 0) + 1;
  });

  const topRepeats = Object.entries(failureCategoryCounts)
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1]);

  // Filtered issues
  const filteredIssues = useMemo(() => {
    return issues.filter((item) => {
      let matchesTab = true;
      if (filterTab === "WITH_ROOT_CAUSE") matchesTab = !!item.rootCause;
      else if (filterTab === "REPEAT") {
        const catName =
          item.failureCategory?.name ||
          (item.otherFailureNote ? `Khác: ${item.otherFailureNote}` : "Chung / Chưa phân loại");
        matchesTab = (failureCategoryCounts[catName] || 0) >= 2;
      } else if (filterTab === "RESOLVED") {
        matchesTab = item.status === "DONE";
      }

      const matchesSev = selectedSeverity === "ALL" || item.severity === selectedSeverity;
      return matchesTab && matchesSev;
    });
  }, [issues, filterTab, selectedSeverity, failureCategoryCounts]);

  function handleCopyPo(po: string) {
    navigator.clipboard.writeText(po);
    setCopiedId(po);
    setTimeout(() => setCopiedId(null), 1500);
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-20">
      {/* ─── 1. HEADER & DEDICATED SEARCH BAR ─────────────────────────────── */}
      <div className="rounded-3xl border border-slate-200/90 bg-white p-6 sm:p-7 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#005A36] text-white shadow-xs">
              <BookOpen size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10.5px] font-extrabold uppercase tracking-wider text-[#005A36] bg-emerald-50 px-2 py-0.2 rounded-md border border-emerald-200">
                  Cơ Sở Tri Thức &amp; Phòng Ngừa Lỗi
                </span>
              </div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl mt-0.5">
                Thư Viện Tra Cứu Sự Cố PO &amp; Bài Học 5M+1E
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                Tra cứu nhanh lịch sử sự cố theo mã PO, nhận diện lỗi lặp lại và kế thừa bài học kinh nghiệm đã xử lý thành công.
              </p>
            </div>
          </div>

          <button
            onClick={() => handleSearch(searchQuery)}
            disabled={loading}
            className="flex items-center gap-1.5 self-start sm:self-auto rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <RefreshCw size={13} className={loading ? "animate-spin text-[#005A36]" : "text-slate-400"} />
            <span>Đồng bộ</span>
          </button>
        </div>

        {/* Search Box */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSearch(searchQuery);
          }}
          className="flex flex-col sm:flex-row gap-2"
        >
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Nhập mã PO, mã sản phẩm hoặc từ khóa (VD: SK-GO-WALK, Hở keo, Quai may...)"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50/70 py-3 pl-10 pr-4 text-xs font-semibold text-slate-900 placeholder-slate-400 focus:border-[#005A36] focus:bg-white focus:outline-none transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex items-center justify-center gap-1.5 rounded-2xl bg-[#005A36] px-7 py-3 text-xs font-bold text-white shadow-xs hover:bg-[#00472A] active:scale-98 disabled:opacity-60 transition-all uppercase tracking-wide"
          >
            {loading ? <RefreshCw size={14} className="animate-spin" /> : <Search size={14} />}
            <span>Tra Cứu</span>
          </button>
        </form>

        {/* Quick PO Chips */}
        <div className="flex items-center gap-1.5 flex-wrap pt-1">
          <span className="text-[11px] font-semibold text-slate-400">PO phổ biến:</span>
          {QUICK_PO_PRESETS.map((po) => (
            <button
              key={po}
              type="button"
              onClick={() => {
                setSearchQuery(po);
                handleSearch(po);
              }}
              className="rounded-lg bg-slate-100 px-2.5 py-1 text-[10.5px] font-medium text-slate-600 hover:bg-emerald-50 hover:text-[#005A36] border border-transparent transition-colors font-mono"
            >
              {po}
            </button>
          ))}
          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                handleSearch("");
              }}
              className="text-[11px] font-bold text-slate-400 hover:text-slate-700 ml-2"
            >
              Xem tất cả
            </button>
          )}
        </div>
      </div>

      {/* ─── 2. REPEAT DEFECT RADAR (CẢNH BÁO LẶP LẠI) ────────────────────── */}
      {topRepeats.length > 0 && (
        <div className="rounded-3xl border border-amber-200 bg-amber-50/50 p-5 shadow-xs">
          <div className="flex items-center justify-between border-b border-amber-200/60 pb-2.5 mb-3">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-200 text-amber-900 text-xs">
                ⚠️
              </span>
              <h2 className="text-xs font-extrabold uppercase tracking-wider text-amber-950">
                Cảnh Báo Lỗi Lặp Lại Cần Lưu Ý Trên Chuyền (≥ 2 lần)
              </h2>
            </div>
            <span className="text-[10px] font-bold text-amber-800 bg-amber-200/80 px-2 py-0.2 rounded-md">
              {topRepeats.length} nhóm lỗi
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
            {topRepeats.map(([name, count]) => (
              <div
                key={name}
                onClick={() => {
                  setSearchQuery(name);
                  handleSearch(name);
                }}
                className="flex items-center justify-between p-3 rounded-2xl bg-white/90 border border-amber-200/80 hover:border-amber-400 transition-colors cursor-pointer"
              >
                <div className="min-w-0 pr-2">
                  <p className="text-xs font-bold text-slate-900 truncate">{name}</p>
                  <p className="text-[10px] text-slate-500">Nhấn để xem toàn bộ sự cố</p>
                </div>
                <span className="flex-shrink-0 rounded-md bg-amber-200 px-2 py-0.5 text-[11px] font-extrabold text-amber-900">
                  {count} lần
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── 3. HIGH-DENSITY INCIDENT LEDGER ──────────────────────────────── */}
      <div className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-xs space-y-4">
        {/* Ledger Header & Filter Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Kết Quả Tra Cứu &amp; Bài Học Kinh Nghiệm ({filteredIssues.length})
            </h2>
            <p className="text-xs text-slate-500">Tra cứu nhanh nguyên nhân gốc 5M+1E và biện pháp phòng ngừa</p>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => setFilterTab("ALL")}
              className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
                filterTab === "ALL"
                  ? "bg-[#005A36] text-white font-bold shadow-2xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Tất cả ({issues.length})
            </button>

            <button
              onClick={() => setFilterTab("WITH_ROOT_CAUSE")}
              className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
                filterTab === "WITH_ROOT_CAUSE"
                  ? "bg-indigo-700 text-white font-bold shadow-2xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Đã có kết luận 5M+1E
            </button>

            <button
              onClick={() => setFilterTab("REPEAT")}
              className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
                filterTab === "REPEAT"
                  ? "bg-amber-600 text-white font-bold shadow-2xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Lỗi lặp lại
            </button>

            <button
              onClick={() => setFilterTab("RESOLVED")}
              className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
                filterTab === "RESOLVED"
                  ? "bg-emerald-700 text-white font-bold shadow-2xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Đã nghiệm thu xong
            </button>
          </div>
        </div>

        {/* Incident List */}
        {loading ? (
          <div className="py-16 text-center text-slate-400">
            <RefreshCw size={24} className="mx-auto animate-spin text-[#005A36]" />
            <p className="mt-2 text-xs font-medium">Đang tra cứu cơ sở dữ liệu...</p>
          </div>
        ) : filteredIssues.length === 0 ? (
          <div className="py-12 text-center text-slate-400 rounded-2xl border border-dashed border-slate-200 bg-slate-50/50">
            <p className="text-xs font-medium">Không tìm thấy sự cố nào phù hợp với từ khóa tra cứu.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredIssues.map((item) => {
              const statusMeta = STATUS_META[item.status] || STATUS_META.REPORTED;
              const sevMeta = SEVERITY_META[item.severity] || SEVERITY_META.MEDIUM;

              return (
                <div
                  key={item.id}
                  onClick={() => router.push(`/portal/issues/${item.id}`)}
                  className="group rounded-2xl border border-slate-200 bg-white p-4.5 hover:border-emerald-300 hover:shadow-xs transition-all cursor-pointer"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="space-y-2 min-w-0 flex-1">
                      {/* Top Badges */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="flex items-center gap-1 font-mono text-xs font-extrabold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                          <span>PO {item.poCode}</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopyPo(item.poCode);
                            }}
                            className="text-slate-400 hover:text-slate-700"
                            title="Sao chép mã PO"
                          >
                            {copiedId === item.poCode ? <Check size={11} className="text-emerald-600" /> : <Copy size={11} />}
                          </button>
                        </div>

                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${sevMeta.bg} ${sevMeta.text}`}>
                          {sevMeta.label}
                        </span>

                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${statusMeta.bg} ${statusMeta.text}`}>
                          {statusMeta.label}
                        </span>

                        <span className="text-[11px] text-slate-500 font-medium">
                          {item.area?.name || "Xưởng"}
                          {item.productionLine?.name && ` · ${item.productionLine.name}`}
                        </span>
                      </div>

                      {/* Defect Description */}
                      <p className="text-xs font-bold text-slate-800 leading-relaxed group-hover:text-[#005A36] transition-colors">
                        {item.description}
                      </p>

                      {/* 5M+1E Root Cause & Solution Chips */}
                      {(item.rootCause || item.solution) && (
                        <div className="space-y-1.5 pt-1">
                          {item.rootCause && (
                            <div className="text-[11px] text-emerald-900 bg-emerald-50/90 border border-emerald-200/80 rounded-xl px-3 py-1.5 font-medium flex items-start gap-1.5">
                              <span className="font-bold flex-shrink-0">🌿 Nguyên nhân gốc:</span>
                              <span className="line-clamp-2">{item.rootCause}</span>
                            </div>
                          )}

                          {item.solution && (
                            <div className="text-[11px] text-blue-900 bg-blue-50/90 border border-blue-200/80 rounded-xl px-3 py-1.5 font-medium flex items-start gap-1.5">
                              <span className="font-bold flex-shrink-0">✅ Giải pháp xử lý:</span>
                              <span className="line-clamp-2">{item.solution}</span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Footer Info */}
                      <p className="text-[10.5px] text-slate-400 pt-1">
                        Báo cáo bởi: <strong className="text-slate-600">{item.reporter?.name || "Công nhân"}</strong> · {new Date(item.createdAt).toLocaleDateString("vi-VN")}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 self-end sm:self-center flex-shrink-0 pt-2 sm:pt-0">
                      <Link
                        href={`/portal/issues/${item.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-1 rounded-xl bg-slate-100 px-3.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-[#005A36] hover:text-white transition-all"
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
      </div>
    </div>
  );
}
