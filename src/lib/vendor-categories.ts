export const VENDOR_CATEGORIES = [
  "AI Models & APIs",
  "AI Coding Agents",
  "Editors & IDEs",
  "Hosting & Edge",
  "Design Systems & UI",
  "Frameworks & Tooling",
  "Auth",
  "Databases",
  "Mobile",
  "Dev Workflow",
  "Browsers",
  "Observability",
  "Payments & Email",
  "Search & Web Data",
] as const;

export type VendorCategory = (typeof VENDOR_CATEGORIES)[number] | "Other";

const SLUG_TO_CATEGORY: Record<string, (typeof VENDOR_CATEGORIES)[number]> = {
  // AI Models & APIs
  anthropic: "AI Models & APIs",
  gemini: "AI Models & APIs",
  groq: "AI Models & APIs",
  "meta-ai": "AI Models & APIs",
  "mistral-ai": "AI Models & APIs",
  openai: "AI Models & APIs",
  openrouter: "AI Models & APIs",
  perplexity: "AI Models & APIs",
  xai: "AI Models & APIs",

  // AI Coding Agents
  amp: "AI Coding Agents",
  aider: "AI Coding Agents",
  "claude-code": "AI Coding Agents",
  cline: "AI Coding Agents",
  coderabbit: "AI Coding Agents",
  "continue": "AI Coding Agents",
  "factory-droid": "AI Coding Agents",
  "github-copilot": "AI Coding Agents",
  goose: "AI Coding Agents",
  "hermes-agent": "AI Coding Agents",
  "kilo-code": "AI Coding Agents",
  openclaw: "AI Coding Agents",
  openhands: "AI Coding Agents",
  opencode: "AI Coding Agents",
  qodo: "AI Coding Agents",
  "replit-agent": "AI Coding Agents",
  "roo-code": "AI Coding Agents",
  "t3-code": "AI Coding Agents",
  v0: "AI Coding Agents",

  // Editors & IDEs
  "augment-code": "Editors & IDEs",
  cursor: "Editors & IDEs",
  "dp-code": "Editors & IDEs",
  "google-antigravity": "Editors & IDEs",
  kiro: "Editors & IDEs",
  vscode: "Editors & IDEs",
  windsurf: "Editors & IDEs",
  zed: "Editors & IDEs",

  // Hosting & Edge
  cloudflare: "Hosting & Edge",
  netlify: "Hosting & Edge",
  railway: "Hosting & Edge",
  render: "Hosting & Edge",
  vercel: "Hosting & Edge",

  // Design Systems & UI
  "base-ui": "Design Systems & UI",
  figma: "Design Systems & UI",
  heroui: "Design Systems & UI",
  shadcn: "Design Systems & UI",
  "shadcn-studio": "Design Systems & UI",
  shadcnblocks: "Design Systems & UI",
  shadcnspace: "Design Systems & UI",

  // Frameworks & Tooling
  biome: "Frameworks & Tooling",
  bun: "Frameworks & Tooling",
  fastify: "Frameworks & Tooling",
  hono: "Frameworks & Tooling",
  langchain: "Frameworks & Tooling",
  "model-context-protocol": "Frameworks & Tooling",
  pnpm: "Frameworks & Tooling",
  tanstack: "Frameworks & Tooling",
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
  warp: "Dev Workflow",

  // Browsers
  brave: "Browsers",
  dia: "Browsers",

  // Observability
  openusage: "Observability",
  posthog: "Observability",
  sentry: "Observability",

  // Payments & Email
  resend: "Payments & Email",
  stripe: "Payments & Email",

  // Search & Web Data
  exa: "Search & Web Data",
  firecrawl: "Search & Web Data",
};

export function getCategoryForSlug(slug: string): VendorCategory {
  return SLUG_TO_CATEGORY[slug] ?? "Other";
}
