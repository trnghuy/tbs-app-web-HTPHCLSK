import { Search } from "lucide-react";

export function SearchInput({
  value,
  onChange,
  placeholder,
  className = "",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={`relative ${className}`}>
      <Search
        size={15}
        className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
      />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-56 rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3.5 text-xs font-medium text-slate-900 placeholder:text-slate-400 transition-all duration-150 focus:border-[#005A36] focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-100 sm:w-64"
      />
    </div>
  );
}
