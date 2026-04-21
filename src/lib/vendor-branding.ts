/*
 * All vendor logos are rendered as monochrome masks inheriting `currentColor`,
 * so they look correct in both light and dark modes without per-brand color tricks.
 * The "fill" flag expands the glyph to 80% of the mark (for wordmarks like exa
 * whose source files have built-in padding, or compact marks that visually read
 * small at the default 58%).
 */
type VendorBrandConfig = {
  logoUrl?: string;
  /** Render full-color assets directly instead of recoloring them as masks. */
  renderMode?: "mask" | "image";
  /** Expand the glyph inside the mark (for logos whose own padding makes them read small). */
  fill?: boolean;
};

const vendorBranding: Record<string, VendorBrandConfig> = {
  // Self-hosted so CSS mask-image works without CORS. The SVG viewBox is
  // tight to the glyph bbox (146 225 268 268) so it centers like SimpleIcons.
  openai: { logoUrl: "/logos/openai.svg" },
  anthropic: { logoUrl: "https://cdn.simpleicons.org/anthropic" },
  gemini: { logoUrl: "https://cdn.simpleicons.org/googlegemini" },
  vercel: { logoUrl: "https://cdn.simpleicons.org/vercel" },
  stripe: { logoUrl: "https://cdn.simpleicons.org/stripe" },
  github: { logoUrl: "https://cdn.simpleicons.org/github" },
  cloudflare: { logoUrl: "https://cdn.simpleicons.org/cloudflare" },
  cursor: { logoUrl: "https://cdn.simpleicons.org/cursor" },
  supabase: { logoUrl: "https://cdn.simpleicons.org/supabase" },
  firebase: { logoUrl: "https://cdn.simpleicons.org/firebase" },
  "apple-developer": { logoUrl: "https://cdn.simpleicons.org/apple" },
  "android-developers": { logoUrl: "https://cdn.simpleicons.org/android" },
  // Firecrawl's CDN doesn't send CORS headers; self-host so mask-image works.
  firecrawl: { logoUrl: "/logos/firecrawl.svg", fill: true },
  // Exa's mark is a blue app-style tile, so preserve the color instead of masking it.
  exa: { logoUrl: "/logos/exa.svg", renderMode: "image", fill: true },
  clerk: { logoUrl: "https://cdn.simpleicons.org/clerk" },
  resend: { logoUrl: "https://cdn.simpleicons.org/resend" },
  linear: { logoUrl: "https://cdn.simpleicons.org/linear" },
  docker: { logoUrl: "https://cdn.simpleicons.org/docker" },
};

function getMonogram(vendorName: string) {
  const parts = vendorName
    .split(/\s+/)
    .map((part) => part.replace(/[^A-Za-z0-9]/g, ""))
    .filter(Boolean);

  if (parts.length === 0) return "VW";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
}

export function getVendorBranding(vendorSlug: string, vendorName: string) {
  const brand = vendorBranding[vendorSlug];
  return {
    monogram: getMonogram(vendorName),
    logoUrl: brand?.logoUrl ?? null,
    renderMode: brand?.renderMode ?? "mask",
    fill: brand?.fill ?? false,
  };
}
