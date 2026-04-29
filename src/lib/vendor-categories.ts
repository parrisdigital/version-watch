export const VENDOR_CATEGORIES = [
  "AI Models",
  "AI Coding Agents",
  "Hosting & Edge",
  "Frameworks & Tooling",
  "Auth",
  "Databases",
  "Mobile",
  "Dev Workflow",
  "Observability",
  "Payments & Email",
  "Search",
] as const;

export type VendorCategory = (typeof VENDOR_CATEGORIES)[number] | "Other";

const SLUG_TO_CATEGORY: Record<string, (typeof VENDOR_CATEGORIES)[number]> = {
  // AI Models
  anthropic: "AI Models",
  gemini: "AI Models",
  openai: "AI Models",

  // AI Coding Agents
  cursor: "AI Coding Agents",
  "dp-code": "AI Coding Agents",
  "hermes-agent": "AI Coding Agents",
  openclaw: "AI Coding Agents",
  opencode: "AI Coding Agents",
  openusage: "AI Coding Agents",
  "t3-code": "AI Coding Agents",

  // Hosting & Edge
  cloudflare: "Hosting & Edge",
  netlify: "Hosting & Edge",
  railway: "Hosting & Edge",
  render: "Hosting & Edge",
  vercel: "Hosting & Edge",

  // Frameworks & Tooling
  biome: "Frameworks & Tooling",
  bun: "Frameworks & Tooling",
  fastify: "Frameworks & Tooling",
  hono: "Frameworks & Tooling",
  langchain: "Frameworks & Tooling",
  pnpm: "Frameworks & Tooling",
  shadcn: "Frameworks & Tooling",
  uv: "Frameworks & Tooling",
  vite: "Frameworks & Tooling",

  // Auth
  "better-auth": "Auth",
  clerk: "Auth",
  workos: "Auth",

  // Databases
  convex: "Databases",
  neon: "Databases",
  planetscale: "Databases",
  prisma: "Databases",
  supabase: "Databases",

  // Mobile
  "android-developers": "Mobile",
  "apple-developer": "Mobile",
  expo: "Mobile",
  firebase: "Mobile",

  // Dev Workflow
  docker: "Dev Workflow",
  github: "Dev Workflow",
  linear: "Dev Workflow",

  // Observability
  posthog: "Observability",
  sentry: "Observability",

  // Payments & Email
  resend: "Payments & Email",
  stripe: "Payments & Email",

  // Search
  exa: "Search",
  firecrawl: "Search",
};

export function getCategoryForSlug(slug: string): VendorCategory {
  return SLUG_TO_CATEGORY[slug] ?? "Other";
}
