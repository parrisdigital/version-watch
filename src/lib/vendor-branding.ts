type VendorBrandConfig = {
  logoUrl?: string;
  surfaceClassName?: string;
  imageClassName?: string;
};

const vendorBranding: Record<string, VendorBrandConfig> = {
  openai: {
    logoUrl:
      "https://images.ctfassets.net/kftzwdyauwt9/3hUGLn3ypllZ0oa01qOYVq/28e8188e6f11b84c3e876569d492734f/Blossom_Light.svg?q=90&w=3840",
    surfaceClassName: "border-white/20 bg-white",
    imageClassName: "h-5 w-5",
  },
  anthropic: { logoUrl: "https://cdn.simpleicons.org/anthropic/F4F4F5?viewbox=auto" },
  gemini: { logoUrl: "https://cdn.simpleicons.org/googlegemini/F4F4F5?viewbox=auto" },
  vercel: { logoUrl: "https://cdn.simpleicons.org/vercel/F4F4F5?viewbox=auto" },
  stripe: { logoUrl: "https://cdn.simpleicons.org/stripe/F4F4F5?viewbox=auto" },
  github: { logoUrl: "https://cdn.simpleicons.org/github/F4F4F5?viewbox=auto" },
  cloudflare: { logoUrl: "https://cdn.simpleicons.org/cloudflare/F4F4F5?viewbox=auto" },
  cursor: { logoUrl: "https://cdn.simpleicons.org/cursor/F4F4F5?viewbox=auto" },
  supabase: { logoUrl: "https://cdn.simpleicons.org/supabase/F4F4F5?viewbox=auto" },
  firebase: { logoUrl: "https://cdn.simpleicons.org/firebase/F4F4F5?viewbox=auto" },
  "apple-developer": { logoUrl: "https://cdn.simpleicons.org/apple/F4F4F5?viewbox=auto" },
  "android-developers": { logoUrl: "https://cdn.simpleicons.org/android/F4F4F5?viewbox=auto" },
  firecrawl: {
    logoUrl: "https://firecrawl.dev/logo.svg",
    imageClassName: "h-4 w-8",
  },
  exa: {
    logoUrl: "https://exa.ai/images/brand/LogoMarkSpacingExample.png",
    surfaceClassName: "border-white/20 bg-white",
    imageClassName: "h-5 w-5 scale-[2.15]",
  },
  clerk: { logoUrl: "https://cdn.simpleicons.org/clerk/F4F4F5?viewbox=auto" },
  resend: { logoUrl: "https://cdn.simpleicons.org/resend/F4F4F5?viewbox=auto" },
  linear: { logoUrl: "https://cdn.simpleicons.org/linear/F4F4F5?viewbox=auto" },
  docker: { logoUrl: "https://cdn.simpleicons.org/docker/F4F4F5?viewbox=auto" },
};

function getMonogram(vendorName: string) {
  const parts = vendorName
    .split(/\s+/)
    .map((part) => part.replace(/[^A-Za-z0-9]/g, ""))
    .filter(Boolean);

  if (parts.length === 0) {
    return "VW";
  }

  if (parts.length === 1) {
    return parts[0]!.slice(0, 2).toUpperCase();
  }

  return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
}

export function getVendorBranding(vendorSlug: string, vendorName: string) {
  const brand = vendorBranding[vendorSlug];

  return {
    monogram: getMonogram(vendorName),
    logoUrl: brand?.logoUrl ?? null,
    surfaceClassName: brand?.surfaceClassName ?? "",
    imageClassName: brand?.imageClassName ?? "",
  };
}
