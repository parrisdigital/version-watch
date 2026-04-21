import { getVendorBranding } from "@/lib/vendor-branding";

type VendorMarkSize = "sm" | "md" | "lg" | "xl";

type VendorMarkProps = {
  vendorSlug: string;
  vendorName: string;
  size?: VendorMarkSize;
  className?: string;
};

const sizeClass: Record<VendorMarkSize, string> = {
  sm: "vw-mark-sm",
  md: "vw-mark-md",
  lg: "vw-mark-lg",
  xl: "vw-mark-xl",
};

export function VendorMark({ vendorSlug, vendorName, size = "md", className = "" }: VendorMarkProps) {
  const branding = getVendorBranding(vendorSlug, vendorName);

  return (
    <span aria-hidden="true" className={`vw-mark ${sizeClass[size]} ${className}`}>
      {branding.logoUrl && branding.renderMode === "image" ? (
        <span
          className="vw-mark-image"
          data-fill={branding.fill ? "true" : "false"}
          style={{ ["--vw-logo" as unknown as string]: `url("${branding.logoUrl}")` } as React.CSSProperties}
        />
      ) : branding.logoUrl ? (
        <span
          className="vw-mark-logo"
          data-fill={branding.fill ? "true" : "false"}
          style={{ ["--vw-logo" as unknown as string]: `url("${branding.logoUrl}")` } as React.CSSProperties}
        />
      ) : (
        <span className="font-[var(--font-mono)] text-[0.6875rem] uppercase tracking-wide text-[var(--color-ink-muted)]">
          {branding.monogram}
        </span>
      )}
    </span>
  );
}
