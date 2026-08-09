"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  UploadCloud,
  X,
  RefreshCw,
  Camera,
  Check,
  Zap,
  Tag,
  Sparkles,
} from "lucide-react";
import {
  Category,
  Severity,
  portalApi,
  UserPublic,
} from "@/lib/portal-client";

const SIZE_OPTIONS = ["35", "36", "37", "38", "39", "40", "41", "42", "43", "44"];

const SEVERITY_CARDS: {
  value: Severity;
  label: string;
  desc: string;
  icon: string;
  activeClass: string;
}[] = [
  {
    value: "LOW",
    label: "Thấp",
    desc: "Chỉnh sửa nhanh tại chỗ, không dừng chuyền",
    icon: "🌱",
    activeClass: "border-slate-400 bg-slate-50 text-slate-900 ring-2 ring-slate-400/30",
  },
  {
    value: "MEDIUM",
    label: "Trung Bình",
    desc: "Lỗi cụm linh kiện, cần QA hỗ trợ xem xét",
    icon: "🛠️",
    activeClass: "border-blue-500 bg-blue-50 text-blue-950 ring-2 ring-blue-500/20",
  },
  {
    value: "HIGH",
    label: "Cao",
    desc: "Nguy cơ lan truyền lỗi sang nhiều sản phẩm",
    icon: "⚠️",
    activeClass: "border-amber-500 bg-amber-50 text-amber-950 ring-2 ring-amber-500/20",
  },
  {
    value: "URGENT",
    label: "Khẩn Cấp (SOS)",
    desc: "Dừng chuyền may ngay để ngăn phế phẩm",
    icon: "🚨",
    activeClass: "border-rose-500 bg-rose-50 text-rose-950 ring-2 ring-rose-500/20",
  },
];

const COMMON_DEFECT_TAGS = [
  { label: "Quai may lệch chỉ", icon: "🧵" },
  { label: "Hở keo viền gót", icon: "🧴" },
  { label: "Nhăn quăn da mũi", icon: "✂️" },
  { label: "Đứt chỉ may viền", icon: "🪡" },
  { label: "Lệch form đế", icon: "📐" },
  { label: "Vết bẩn keo da", icon: "🧼" },
];

export default function ReportIssuePage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<UserPublic | null>(null);

  // Form State
  const [poCode, setPoCode] = useState("");
  const [productName, setProductName] = useState("");
  const [areaId, setAreaId] = useState("");
  const [productionLineId, setProductionLineId] = useState("");
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [severity, setSeverity] = useState<Severity>("MEDIUM");
  const [description, setDescription] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [submittingReport, setSubmittingReport] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const [reportSuccess, setReportSuccess] = useState(false);

  const [areas, setAreas] = useState<Category[]>([]);
  const [lines, setLines] = useState<Category[]>([]);

  useEffect(() => {
    Promise.all([
      portalApi.getMe().catch(() => null),
      portalApi.listAreas().catch(() => []),
    ]).then(([meRes, areaList]) => {
      if (meRes?.user) {
        setCurrentUser(meRes.user);
        if (meRes.user.areaId) {
          setAreaId(meRes.user.areaId);
          portalApi.listProductionLines(meRes.user.areaId).then(setLines).catch(() => {});
        }
      }
      setAreas(areaList);
    });
  }, []);

  async function handleAreaChange(nextAreaId: string) {
    setAreaId(nextAreaId);
    setProductionLineId("");
    if (!nextAreaId) {
      setLines([]);
      return;
    }
    try {
      const lineList = await portalApi.listProductionLines(nextAreaId);
      setLines(lineList);
    } catch {
      setLines([]);
    }
  }

  function handleToggleSize(sz: string) {
    setSelectedSizes((prev) => (prev.includes(sz) ? prev.filter((s) => s !== sz) : [...prev, sz]));
  }

  function handleSelectAllSizes() {
    if (selectedSizes.length === SIZE_OPTIONS.length) {
      setSelectedSizes([]);
    } else {
      setSelectedSizes([...SIZE_OPTIONS]);
    }
  }

  function handleAddDefectTag(tagLabel: string) {
    setDescription((prev) => (prev ? `${prev}, ${tagLabel}` : tagLabel));
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploadingImage(true);
    setReportError(null);
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve, reject) => {
          reader.onload = () => {
            const res = reader.result as string;
            const base64 = res.includes(",") ? res.split(",")[1] : res;
            resolve(base64);
          };
          reader.onerror = reject;
        });
        reader.readAsDataURL(file);
        const base64 = await base64Promise;
        const uploadRes = await portalApi.uploadImage(base64, file.type || "image/jpeg");
        setImages((prev) => [...prev, uploadRes.url]);
      }
    } catch {
      setReportError("Không thể tải ảnh lên. Vui lòng thử lại.");
    } finally {
      setUploadingImage(false);
      e.target.value = "";
    }
  }

  async function handleSubmitReport(e: React.FormEvent) {
    e.preventDefault();
    if (!poCode.trim()) {
      setReportError("Vui lòng nhập Mã sản phẩm / PO.");
      return;
    }
    if (!description.trim()) {
      setReportError("Vui lòng nhập Mô tả chi tiết hiện tượng lỗi.");
      return;
    }
    if (!areaId) {
      setReportError("Vui lòng chọn Phân xưởng.");
      return;
    }

    setSubmittingReport(true);
    setReportError(null);
    try {
      const fullDescription = [
        productName.trim() ? `[Sản phẩm: ${productName.trim()}]` : "",
        selectedSizes.length > 0 ? `[Size: ${selectedSizes.join(", ")}]` : "",
        description.trim(),
      ]
        .filter(Boolean)
        .join(" ");

      const result = await portalApi.reportIssue({
        areaId,
        productionLineId: productionLineId || undefined,
        severity,
        poCode: poCode.trim(),
        description: fullDescription,
        images: images.length > 0 ? images : undefined,
      });

      setReportSuccess(true);
      setTimeout(() => {
        router.push(`/portal/issues/${result.id}`);
      }, 1000);
    } catch (err: unknown) {
      setReportError(err instanceof Error ? err.message : "Có lỗi xảy ra khi gửi báo cáo.");
    } finally {
      setSubmittingReport(false);
    }
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-20">
      {/* Back to Dashboard Breadcrumb */}
      <div className="flex items-center justify-between">
        <Link
          href="/portal"
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
        >
          <ArrowLeft size={14} />
          <span>Quay lại Trang Chủ</span>
        </Link>

        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-bold text-[#005A36]">Quy trình 2 Giờ Vàng</span>
        </div>
      </div>

      {reportSuccess && (
        <div className="rounded-2xl border border-emerald-300 bg-emerald-50 p-4 text-emerald-950 shadow-xs flex items-center gap-3 animate-in fade-in-50">
          <CheckCircle2 size={24} className="text-emerald-700 flex-shrink-0" />
          <div>
            <p className="text-xs font-bold">Cảm ơn bạn! Báo cáo sự cố đã được phát động thành công.</p>
            <p className="text-[11px] text-emerald-800">Đang tự động chuyển tới trung tâm phân tích 5M+1E...</p>
          </div>
        </div>
      )}

      {/* ─── 2-COLUMN DEFECT STUDIO CANVAS (IMAGE 1) ──────────────────────── */}
      <form onSubmit={handleSubmitReport} className="rounded-3xl border border-slate-200/90 bg-white p-6 sm:p-8 shadow-xs space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8">
          {/* CỘT 1: SẢN PHẨM & VỊ TRÍ (col-span-6) */}
          <div className="lg:col-span-6 space-y-5 border-b lg:border-b-0 lg:border-r border-slate-100 pb-6 lg:pb-0 lg:pr-6">
            <div>
              <h2 className="text-xs font-bold text-[#005A36] uppercase tracking-wider flex items-center gap-1.5">
                <span>1. Sự cố xảy ra ở sản phẩm &amp; vị trí nào?</span>
              </h2>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Điền mã sản phẩm và nơi phát hiện để đội ngũ điều phối tới đúng chuyền.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Mã PO / Sản phẩm <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={poCode}
                  onChange={(e) => setPoCode(e.target.value)}
                  placeholder="VD: SK-GO-WALK-6"
                  required
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50/60 px-3.5 py-2.5 text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:border-[#005A36] focus:bg-white focus:outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Tên sản phẩm
                </label>
                <input
                  type="text"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  placeholder="VD: Giày Skechers Go Walk Flex"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50/60 px-3.5 py-2.5 text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:border-[#005A36] focus:bg-white focus:outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Phân xưởng phát hiện <span className="text-rose-500">*</span>
                </label>
                <select
                  value={areaId}
                  onChange={(e) => handleAreaChange(e.target.value)}
                  required
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50/60 px-3 py-2.5 text-xs font-semibold text-slate-900 focus:border-[#005A36] focus:bg-white focus:outline-none transition-colors"
                >
                  <option value="">-- Chọn Phân xưởng --</option>
                  {areas.map((a) => (
                    <option key={a.id} value={a.id}>
                      [{a.name}] {a.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Công đoạn / Chuyền
                </label>
                <select
                  value={productionLineId}
                  onChange={(e) => setProductionLineId(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50/60 px-3 py-2.5 text-xs font-semibold text-slate-900 focus:border-[#005A36] focus:bg-white focus:outline-none transition-colors"
                >
                  <option value="">VD: Công đoạn Gò mũi / Chuyền 1</option>
                  {lines.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Size Matrix */}
            <div className="pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <span className="text-xs font-bold text-slate-800">Những cỡ giày (size) nào bị ảnh hưởng?</span>
                  <p className="text-[10.5px] text-slate-500">Chạm để chọn các size phát hiện lỗi</p>
                </div>

                <button
                  type="button"
                  onClick={handleSelectAllSizes}
                  className="text-[11px] font-bold text-[#005A36] hover:underline"
                >
                  {selectedSizes.length === SIZE_OPTIONS.length ? "Bỏ chọn tất cả" : "Chọn tất cả"}
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                {SIZE_OPTIONS.map((sz) => {
                  const isSelected = selectedSizes.includes(sz);
                  return (
                    <button
                      key={sz}
                      type="button"
                      onClick={() => handleToggleSize(sz)}
                      className={`h-10 min-w-[44px] px-3 rounded-2xl border text-xs font-bold transition-all ${
                        isSelected
                          ? "border-[#005A36] bg-[#005A36] text-white shadow-xs scale-102"
                          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300"
                      }`}
                    >
                      {sz}
                    </button>
                  );
                })}
              </div>

              {selectedSizes.length > 0 && (
                <p className="text-[11px] text-emerald-800 font-semibold mt-2">
                  ✓ Đã chọn {selectedSizes.length} cỡ: {selectedSizes.join(", ")}
                </p>
              )}
            </div>
          </div>

          {/* CỘT 2: MỨC ĐỘ & HIỆN TƯỢNG LỖI & ẢNH (col-span-6) */}
          <div className="lg:col-span-6 space-y-5">
            <div>
              <h2 className="text-xs font-bold text-[#005A36] uppercase tracking-wider flex items-center gap-1.5">
                <span>2. Đánh giá mức độ &amp; Mô tả hiện tượng</span>
              </h2>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Cung cấp mô tả cụ thể để kỹ thuật viên chuẩn bị dụng cụ phù hợp.
              </p>
            </div>

            {/* Severity Cards */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1.5">
                Mức độ nghiêm trọng <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                {SEVERITY_CARDS.map((opt) => {
                  const isSelected = severity === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setSeverity(opt.value)}
                      className={`p-3 rounded-2xl border text-left transition-all ${
                        isSelected
                          ? opt.activeClass
                          : "border-slate-200 bg-white hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold flex items-center gap-1">
                          <span>{opt.icon}</span>
                          <span>{opt.label}</span>
                        </span>
                        {isSelected && <Check size={13} className="text-emerald-700" />}
                      </div>
                      <p className="text-[10px] text-slate-500 line-clamp-1 mt-1 leading-tight">{opt.desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Description & 1-Touch Defect Suggestions */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Mô tả chi tiết hiện tượng lỗi <span className="text-rose-500">*</span>
              </label>

              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="VD: Quai may lệch chỉ 2mm, đường may nhăn quăn gót, hở keo đế..."
                required
                className="w-full rounded-2xl border border-slate-200 bg-slate-50/60 p-3 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:border-[#005A36] focus:bg-white focus:outline-none transition-colors"
              />

              {/* Helpful Defect Chips */}
              <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                <span className="text-[10.5px] font-semibold text-slate-400">Gợi ý nhanh:</span>
                {COMMON_DEFECT_TAGS.map((tag) => (
                  <button
                    key={tag.label}
                    type="button"
                    onClick={() => handleAddDefectTag(tag.label)}
                    className="flex items-center gap-1 rounded-full bg-slate-100 border border-slate-200/60 px-2.5 py-0.5 text-[10.5px] font-medium text-slate-700 hover:bg-emerald-50 hover:border-emerald-300 hover:text-[#005A36] transition-colors"
                  >
                    <span>{tag.icon}</span>
                    <span>{tag.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Image Upload Strip */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1.5">
                Hình ảnh minh chứng thực tế tại chuyền
              </label>

              <div className="flex items-center gap-2.5 flex-wrap">
                <label className="flex flex-col items-center justify-center h-20 w-24 rounded-2xl border-2 border-dashed border-emerald-300 bg-emerald-50/40 hover:bg-emerald-50 hover:border-emerald-600 transition-colors cursor-pointer text-center p-1 flex-shrink-0">
                  {uploadingImage ? (
                    <RefreshCw size={16} className="animate-spin text-[#005A36]" />
                  ) : (
                    <>
                      <Camera size={20} className="text-[#005A36]" />
                      <span className="text-[10px] font-bold text-[#005A36] mt-1">Chụp / Tải ảnh</span>
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageUpload}
                    disabled={uploadingImage}
                    className="hidden"
                  />
                </label>

                {images.map((imgUrl, idx) => (
                  <div key={idx} className="relative h-20 w-20 rounded-2xl border border-slate-200 overflow-hidden group flex-shrink-0 shadow-2xs">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={imgUrl} alt={`Ảnh ${idx + 1}`} className="h-full w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setImages((prev) => prev.filter((_, i) => i !== idx))}
                      className="absolute top-1 right-1 h-5 w-5 rounded-full bg-slate-900/80 text-white flex items-center justify-center hover:bg-rose-600 transition-colors"
                    >
                      <X size={10} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {reportError && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3.5 text-xs font-semibold text-rose-700 flex items-center gap-2">
            <AlertTriangle size={16} />
            <span>{reportError}</span>
          </div>
        )}

        {/* ─── ACTION FOOTER ──────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-slate-100 pt-5">
          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-[#005A36] text-[10px] font-bold">
              ✓
            </span>
            {poCode.trim() ? (
              <span>
                Đang lập phiếu cho: <strong className="text-slate-900 font-mono">PO {poCode}</strong> ({selectedSizes.length} size)
              </span>
            ) : (
              <span>Điền mã PO và nội dung để gửi thông báo tức thời tới QA &amp; Trưởng Line</span>
            )}
          </div>

          <button
            type="submit"
            disabled={submittingReport || uploadingImage}
            className="flex items-center justify-center gap-2 rounded-2xl bg-[#005A36] px-7 py-3 text-xs font-bold text-white shadow-sm hover:bg-[#00472A] active:scale-98 disabled:opacity-60 transition-all uppercase tracking-wide"
          >
            {submittingReport ? (
              <>
                <RefreshCw size={15} className="animate-spin" />
                <span>Đang Phát Động...</span>
              </>
            ) : (
              <>
                <Sparkles size={15} className="text-lime-300" />
                <span>Gửi Báo Cáo &amp; Phát Động 2 Giờ Vàng</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
