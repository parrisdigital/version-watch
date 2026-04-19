"use client";

import { useState } from "react";

import { getVendorBranding } from "@/lib/vendor-branding";

type VendorMarkProps = {
  vendorSlug: string;
  vendorName: string;
  size?: "sm" | "md" | "lg";
};

const sizeClasses = {
  sm: "h-10 w-10 text-[0.7rem]",
  md: "h-12 w-12 text-sm",
  lg: "h-14 w-14 text-base",
};

const imageSizeClasses = {
  sm: "h-4 w-4",
  md: "h-5 w-5",
  lg: "h-6 w-6",
};

export function VendorMark({ vendorSlug, vendorName, size = "md" }: VendorMarkProps) {
  const [hasError, setHasError] = useState(false);
  const branding = getVendorBranding(vendorSlug, vendorName);

  return (
    <span
      aria-hidden="true"
      className={`inline-flex overflow-hidden items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] text-zinc-200 ${sizeClasses[size]} ${branding.surfaceClassName ?? ""}`}
    >
      {branding.logoUrl && !hasError ? (
        <img
          alt=""
          src={branding.logoUrl}
          loading="lazy"
          className={`${imageSizeClasses[size]} object-contain ${branding.imageClassName ?? ""}`}
          onError={() => setHasError(true)}
        />
      ) : (
        <span className="font-mono uppercase tracking-[0.18em] text-zinc-400">{branding.monogram}</span>
      )}
    </span>
  );
}
