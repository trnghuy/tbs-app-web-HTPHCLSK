export function BrandMark({
  size = 40,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/logo.png"
      alt="TBS Group"
      className={`object-contain ${className}`}
      style={{ height: size, width: "auto", maxHeight: size }}
    />
  );
}

export function BrandLogoFull({
  height = 42,
  className = "",
}: {
  height?: number;
  className?: string;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/logo.png"
      alt="TBS Group Logo"
      className={`object-contain max-w-full ${className}`}
      style={{ height, width: "auto" }}
    />
  );
}

export function BrandLogo({ size = 36, textClassName = "text-white" }: { size?: number; textClassName?: string }) {
  return (
    <div className="flex items-center gap-2">
      <BrandMark size={size} />
      <div className={`leading-tight ${textClassName}`}>
        <div className="text-sm font-bold tracking-wide">TBS GROUP</div>
        <div className="text-[10px] opacity-70">Quản trị Chất Lượng</div>
      </div>
    </div>
  );
}
