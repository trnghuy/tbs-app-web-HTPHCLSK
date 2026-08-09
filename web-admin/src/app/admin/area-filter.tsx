"use client";

import { useRouter, useSearchParams } from "next/navigation";

export default function AreaFilter({ areas }: { areas: { id: string; name: string }[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const current = searchParams.get("areaId") || "";

  function handleChange(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set("areaId", value);
    } else {
      params.delete("areaId");
    }
    const qs = params.toString();
    router.push(qs ? `/admin?${qs}` : "/admin");
  }

  return (
    <select
      value={current}
      onChange={(e) => handleChange(e.target.value)}
      className="rounded-xl border border-[#e8e4de] bg-[#f9f8f6] px-3.5 py-2 text-xs font-semibold text-warm-700 transition-all duration-150 focus:border-brand-mid focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-lighter"
    >
      <option value="">Tất cả khu vực</option>
      {areas.map((a) => (
        <option key={a.id} value={a.id}>
          {a.name}
        </option>
      ))}
    </select>
  );
}
