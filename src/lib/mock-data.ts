import type { ImpactConfidence, ReleaseClass } from "@/lib/classification/signal";

export type SourceType =
  | "github_release"
  | "changelog_page"
  | "docs_page"
  | "blog"
  | "rss";

export type ImportanceBand = "critical" | "high" | "medium" | "low";

export type VendorSource = {
  name: string;
  url: string;
  type: SourceType;
};

export type VendorRecord = {
  slug: string;
  name: string;
  description: string;
  sources: VendorSource[];
};

export type MockEvent = {
  id: string;
  slug: string;
  vendorSlug: string;
  vendorName: string;
  title: string;
  summary: string;
  whatChanged: string;
  whyItMatters: string;
  whoShouldCare: string[];
  affectedStack: string[];
  categories: string[];
  topicTags?: string[];
  releaseClass?: ReleaseClass;
  impactConfidence?: ImpactConfidence;
  signalReasons?: string[];
  scoreVersion?: string;
  publishedAt: string;
  sourceUrl: string;
  sourceType: SourceType;
  importanceBand: ImportanceBand;
  sourceName?: string;
  sourceSurfaceUrl?: string;
  sourceSurfaceName?: string;
  sourceSurfaceType?: SourceType;
  sourceTitle?: string;
  githubUrl?: string;
};

export type ReviewCandidate = {
  id: string;
  vendorSlug: string;
  vendorName: string;
  title: string;
  sourceType: SourceType;
  publishedAt: string;
  status: "pending_review" | "published" | "rejected" | "suppressed";
  parseConfidence: "high" | "medium" | "low";
  rawBody: string;
};

export type SourceHealthEntry = {
  vendorName: string;
  sourceName: string;
  status: "healthy" | "degraded" | "failing";
  lastSuccessAt: string;
};

export const vendors: VendorRecord[] = [
  {
    slug: "openai",
    name: "OpenAI",
    description: "Model, API, and Codex updates for application teams.",
    sources: [
      { name: "API Changelog", url: "https://developers.openai.com/api/docs/changelog", type: "docs_page" },
      { name: "Codex Changelog", url: "https://developers.openai.com/codex/changelog", type: "changelog_page" },
    ],
  },
  {
    slug: "anthropic",
    name: "Anthropic",
    description: "Claude and Anthropic API release intelligence.",
    sources: [
      { name: "Platform Release Notes", url: "https://platform.claude.com/docs/en/release-notes/overview", type: "docs_page" },
      { name: "Product Release Notes", url: "https://support.claude.com/en/articles/12138966-release-notes", type: "changelog_page" },
    ],
  },
  {
    slug: "gemini",
    name: "Google Gemini",
    description: "Gemini API and model platform changes.",
    sources: [{ name: "Gemini API Changelog", url: "https://ai.google.dev/gemini-api/docs/changelog", type: "docs_page" }],
  },
  {
    slug: "xai",
    name: "xAI / Grok",
    description: "Grok model, API, voice, tools, and platform release notes.",
    sources: [{ name: "xAI Docs LLM Feed", url: "https://docs.x.ai/llms.txt", type: "docs_page" }],
  },
  {
    slug: "meta-ai",
    name: "Meta AI",
    description: "Llama model, API SDK, and Meta AI developer releases.",
    sources: [
      { name: "Llama Models Releases", url: "https://github.com/meta-llama/llama-models/releases.atom", type: "rss" },
      { name: "Llama API Python Releases", url: "https://github.com/meta-llama/llama-api-python/releases.atom", type: "rss" },
      { name: "Llama API TypeScript Releases", url: "https://github.com/meta-llama/llama-api-typescript/releases.atom", type: "rss" },
    ],
  },
  {
    slug: "groq",
    name: "Groq",
    description: "Fast inference, model, SDK, and agentic AI platform updates from GroqCloud.",
    sources: [{ name: "Groq Changelog", url: "https://console.groq.com/docs/changelog", type: "docs_page" }],
  },
  {
    slug: "vercel",
    name: "Vercel",
    description: "Hosting, runtime, AI SDK, and deployment changes.",
    sources: [{ name: "Vercel Changelog", url: "https://vercel.com/changelog", type: "changelog_page" }],
  },
  {
    slug: "stripe",
    name: "Stripe",
    description: "Payments platform and API changes.",
    sources: [{ name: "Stripe Changelog", url: "https://docs.stripe.com/changelog", type: "changelog_page" }],
  },
  {
    slug: "github",
    name: "GitHub",
    description: "Developer workflow, Actions, and platform changes.",
    sources: [{ name: "GitHub Changelog", url: "https://github.blog/changelog/feed/", type: "rss" }],
  },
  {
    slug: "cloudflare",
    name: "Cloudflare",
    description: "Workers, networking, storage, and platform changes.",
    sources: [{ name: "Cloudflare Changelog", url: "https://developers.cloudflare.com/changelog/rss/index.xml", type: "rss" }],
  },
  {
    slug: "cursor",
    name: "Cursor",
    description: "AI coding workflow and editor changes.",
    sources: [{ name: "Cursor Changelog", url: "https://cursor.com/changelog/", type: "changelog_page" }],
  },
  {
    slug: "cline",
    name: "Cline",
    description: "Open-source coding agent releases for IDE-based developer workflows.",
    sources: [{ name: "GitHub Releases", url: "https://github.com/cline/cline/releases.atom", type: "rss" }],
  },
  {
    slug: "augment-code",
    name: "Augment Code",
    description: "AI coding agent, editor extension, CLI, and IDE release updates from Augment.",
    sources: [{ name: "Augment Changelog", url: "https://www.augmentcode.com/changelog", type: "changelog_page" }],
  },
  {
    slug: "warp",
    name: "Warp",
    description: "Agentic terminal, developer workflow, and desktop release notes.",
    sources: [{ name: "Warp Docs LLM Feed", url: "https://docs.warp.dev/llms-full.txt", type: "docs_page" }],
  },
  {
    slug: "vscode",
    name: "Visual Studio Code",
    description: "Editor, extension host, AI workflow, and developer tooling updates.",
    sources: [{ name: "VS Code Updates Feed", url: "https://code.visualstudio.com/feed.xml", type: "rss" }],
  },
  {
    slug: "zed",
    name: "Zed",
    description: "Fast collaborative editor and AI-assisted developer workflow releases.",
    sources: [{ name: "Zed Stable Releases", url: "https://zed.dev/releases/stable", type: "changelog_page" }],
  },
  {
    slug: "dia",
    name: "Dia",
    description: "AI browser release notes for developer research and agent-assisted browsing workflows.",
    sources: [{ name: "Dia Changelog", url: "https://www.diabrowser.com/changelog", type: "changelog_page" }],
  },
  {
    slug: "brave",
    name: "Brave",
    description: "Privacy browser, Leo AI, Web3, and desktop release notes.",
    sources: [{ name: "Brave Release Notes", url: "https://brave.com/latest/", type: "changelog_page" }],
  },
  {
    slug: "windsurf",
    name: "Windsurf",
    description: "AI coding editor release coverage placeholder until a reliable machine-readable source is available.",
    sources: [{ name: "Windsurf Changelog", url: "https://windsurf.com/changelog", type: "changelog_page" }],
  },
  {
    slug: "google-antigravity",
    name: "Google Antigravity",
    description: "Agentic development environment coverage placeholder until server-rendered release notes are available.",
    sources: [{ name: "Antigravity Changelog", url: "https://antigravity.google/changelog", type: "changelog_page" }],
  },
  {
    slug: "supabase",
    name: "Supabase",
    description: "Database, auth, and backend platform changes.",
    sources: [{ name: "Supabase Changelog", url: "https://supabase.com/changelog", type: "changelog_page" }],
  },
  {
    slug: "firebase",
    name: "Firebase",
    description: "Broad mobile and web backend release updates.",
    sources: [
      { name: "JavaScript SDK Release Notes", url: "https://firebase.google.com/support/release-notes/js?hl=en", type: "docs_page" },
      { name: "Android SDK Release Notes", url: "https://firebase.google.com/support/release-notes/android?hl=en", type: "docs_page" },
      { name: "Apple SDK Release Notes", url: "https://firebase.google.com/support/release-notes/ios?hl=en", type: "docs_page" },
    ],
  },
  {
    slug: "apple-developer",
    name: "Apple",
    description: "Xcode, SDK, TestFlight, and Apple platform release notes.",
    sources: [{ name: "Developer Releases", url: "https://developer.apple.com/news/releases/rss/releases.rss", type: "rss" }],
  },
  {
    slug: "android-developers",
    name: "Android",
    description: "Android platform release notes and API changes.",
    sources: [{ name: "Android Release Notes", url: "https://developer.android.com/about/versions/17/release-notes?hl=en", type: "docs_page" }],
  },
  {
    slug: "firecrawl",
    name: "Firecrawl",
    description: "Scraping and agent tooling changes.",
    sources: [{ name: "Firecrawl Changelog", url: "https://www.firecrawl.dev/changelog", type: "changelog_page" }],
  },
  {
    slug: "exa",
    name: "Exa",
    description: "AI search and research API updates.",
    sources: [{ name: "Exa Changelog", url: "https://exa.ai/docs/changelog", type: "docs_page" }],
  },
  {
    slug: "clerk",
    name: "Clerk",
    description: "Authentication and org platform changes.",
    sources: [{ name: "Clerk Changelog", url: "https://clerk.com/changelog", type: "changelog_page" }],
  },
  {
    slug: "resend",
    name: "Resend",
    description: "Email infrastructure and sending API updates.",
    sources: [{ name: "Resend Changelog", url: "https://resend.com/changelog", type: "changelog_page" }],
  },
  {
    slug: "linear",
    name: "Linear",
    description: "Product and developer workflow platform changes.",
    sources: [{ name: "Linear Changelog", url: "https://linear.app/changelog", type: "changelog_page" }],
  },
  {
    slug: "docker",
    name: "Docker",
    description: "Container tooling and Docker Desktop release changes.",
    sources: [{ name: "Docker Desktop Release Notes", url: "https://docs.docker.com/desktop/release-notes/", type: "docs_page" }],
  },
  {
    slug: "hermes-agent",
    name: "Hermes Agent",
    description: "Open-source agent runtime, memory, and toolchain releases.",
    sources: [{ name: "GitHub Releases", url: "https://github.com/NousResearch/hermes-agent/releases", type: "changelog_page" }],
  },
  {
    slug: "t3-code",
    name: "T3 Code",
    description: "AI coding agent and desktop workflow releases from T3.",
    sources: [{ name: "GitHub Releases", url: "https://github.com/pingdotgg/t3code/releases", type: "changelog_page" }],
  },
  {
    slug: "opencode",
    name: "OpenCode",
    description: "Open-source coding agent updates across core, desktop, and SDK.",
    sources: [{ name: "GitHub Releases", url: "https://github.com/anomalyco/opencode/releases", type: "changelog_page" }],
  },
  {
    slug: "openusage",
    name: "OpenUsage",
    description: "AI subscription usage tracker releases and provider support changes.",
    sources: [{ name: "GitHub Releases", url: "https://github.com/robinebers/openusage/releases", type: "changelog_page" }],
  },
  {
    slug: "dp-code",
    name: "DP Code",
    description: "AI coding environment releases and workflow updates.",
    sources: [{ name: "GitHub Releases", url: "https://github.com/Emanuele-web04/dpcode/releases", type: "changelog_page" }],
  },
  {
    slug: "shadcn",
    name: "shadcn/ui",
    description: "Component registry, CLI, and UI system releases.",
    sources: [{ name: "GitHub Releases", url: "https://github.com/shadcn-ui/ui/releases", type: "changelog_page" }],
  },
  {
    slug: "hono",
    name: "Hono",
    description: "Web standards-first framework releases for edge and server runtimes.",
    sources: [{ name: "GitHub Releases", url: "https://github.com/honojs/hono/releases", type: "changelog_page" }],
  },
  {
    slug: "bun",
    name: "Bun",
    description: "JavaScript runtime, package manager, and tooling releases.",
    sources: [{ name: "GitHub Releases", url: "https://github.com/oven-sh/bun/releases", type: "changelog_page" }],
  },
  {
    slug: "vite",
    name: "Vite",
    description: "Frontend build tooling and create-vite release updates.",
    sources: [{ name: "GitHub Releases", url: "https://github.com/vitejs/vite/releases", type: "changelog_page" }],
  },
  {
    slug: "openclaw",
    name: "OpenClaw",
    description: "Open-source AI agent runtime and desktop assistant releases.",
    sources: [{ name: "GitHub Releases", url: "https://github.com/openclaw/openclaw/releases", type: "changelog_page" }],
  },
  {
    slug: "biome",
    name: "Biome",
    description: "Formatter, linter, and web toolchain release updates.",
    sources: [{ name: "GitHub Releases", url: "https://github.com/biomejs/biome/releases", type: "changelog_page" }],
  },
  {
    slug: "pnpm",
    name: "pnpm",
    description: "Package manager and workspace tooling releases.",
    sources: [{ name: "GitHub Releases", url: "https://github.com/pnpm/pnpm/releases", type: "changelog_page" }],
  },
  {
    slug: "fastify",
    name: "Fastify",
    description: "Node.js framework and server release updates.",
    sources: [{ name: "GitHub Releases", url: "https://github.com/fastify/fastify/releases", type: "changelog_page" }],
  },
  {
    slug: "uv",
    name: "uv",
    description: "Python package, environment, and workflow tool releases.",
    sources: [{ name: "GitHub Releases", url: "https://github.com/astral-sh/uv/releases", type: "changelog_page" }],
  },
  {
    slug: "convex",
    name: "Convex",
    description: "Backend platform, workflows, and platform update news from Convex.",
    sources: [{ name: "Convex News", url: "https://news.convex.dev/", type: "changelog_page" }],
  },
  {
    slug: "workos",
    name: "WorkOS",
    description: "Enterprise auth, org management, and AuthKit release updates.",
    sources: [
      { name: "WorkOS Changelog", url: "https://workos.com/changelog", type: "changelog_page" },
      { name: "AuthKit JS Releases", url: "https://github.com/workos/authkit-js/releases", type: "github_release" },
    ],
  },
  {
    slug: "posthog",
    name: "PostHog",
    description: "Product engineering, analytics, experimentation, and platform updates.",
    sources: [{ name: "PostHog Changelog", url: "https://posthog.com/changelog", type: "changelog_page" }],
  },
  {
    slug: "netlify",
    name: "Netlify",
    description: "Hosting, agent runners, edge, and developer workflow updates.",
    sources: [{ name: "Netlify Changelog", url: "https://www.netlify.com/changelog", type: "changelog_page" }],
  },
  {
    slug: "render",
    name: "Render",
    description: "Cloud app platform, runtime, database, and workflow changes.",
    sources: [{ name: "Render Changelog", url: "https://render.com/changelog", type: "changelog_page" }],
  },
  {
    slug: "railway",
    name: "Railway",
    description: "Hosting, managed database, and platform workflow updates.",
    sources: [{ name: "Railway Changelog", url: "https://railway.com/changelog", type: "changelog_page" }],
  },
  {
    slug: "prisma",
    name: "Prisma",
    description: "ORM, Prisma Postgres, and database developer tooling releases.",
    sources: [{ name: "Prisma Changelog", url: "https://www.prisma.io/changelog", type: "changelog_page" }],
  },
  {
    slug: "neon",
    name: "Neon",
    description: "Serverless Postgres, branching, and database platform changelog updates.",
    sources: [{ name: "Neon Changelog", url: "https://neon.com/docs/changelog", type: "changelog_page" }],
  },
  {
    slug: "planetscale",
    name: "PlanetScale",
    description: "Managed database platform, APIs, and tooling release updates.",
    sources: [{ name: "PlanetScale Changelog", url: "https://planetscale.com/changelog", type: "changelog_page" }],
  },
  {
    slug: "expo",
    name: "Expo",
    description: "Expo SDK, EAS, mobile workflow, and app delivery updates.",
    sources: [{ name: "Expo Changelog", url: "https://expo.dev/changelog", type: "changelog_page" }],
  },
  {
    slug: "sentry",
    name: "Sentry",
    description: "Observability, debugging, alerts, and SDK platform updates.",
    sources: [{ name: "Sentry Changelog", url: "https://sentry.io/changelog/", type: "changelog_page" }],
  },
  {
    slug: "better-auth",
    name: "Better Auth",
    description: "Authentication framework releases, fixes, and platform changes.",
    sources: [{ name: "Better Auth Changelog", url: "https://better-auth.com/changelog", type: "changelog_page" }],
  },
  {
    slug: "langchain",
    name: "LangChain",
    description: "LangChain and LangSmith platform changelog updates.",
    sources: [{ name: "LangChain Changelog", url: "https://changelog.langchain.com/", type: "changelog_page" }],
  },
];

const vendorNameBySlug = new Map(vendors.map((vendor) => [vendor.slug, vendor.name]));
const vendorSourceNameByUrl = new Map(
  vendors.flatMap((vendor) => vendor.sources.map((source) => [source.url, source.name] as const)),
);

function normalizeUrlForPrefix(value: string) {
  return value.replace(/\/+$/, "");
}

function findVendorSourceForEvent(event: Omit<MockEvent, "vendorName">) {
  const vendor = vendors.find((item) => item.slug === event.vendorSlug);
  if (!vendor) return null;

  const eventUrl = normalizeUrlForPrefix(event.sourceUrl);
  return (
    vendor.sources.find((source) => {
      const sourceUrl = normalizeUrlForPrefix(source.url);
      return eventUrl === sourceUrl || eventUrl.startsWith(`${sourceUrl}/`);
    }) ?? vendor.sources[0] ?? null
  );
}

const eventSeeds: Array<Omit<MockEvent, "vendorName">> = [
  {
    id: "openai-api-deprecations",
    slug: "openai-deprecation-window-for-legacy-responses",
    vendorSlug: "openai",
    title: "OpenAI sets a deprecation window for legacy response surfaces",
    summary: "OpenAI clarified migration timing for older response surfaces and pushed teams toward the newer API path.",
    whatChanged: "The API changelog now draws a sharper line around which older response surfaces are headed for retirement and which newer interfaces should replace them.",
    whyItMatters: "Teams with wrappers, agents, or internal copilots built on earlier response patterns need to schedule migrations before the older path becomes operational debt.",
    whoShouldCare: ["backend", "ai", "product"],
    affectedStack: ["llms", "agents", "developer-workflow"],
    categories: ["deprecation", "api"],
    publishedAt: "2026-04-18T16:15:00.000Z",
    sourceUrl: "https://developers.openai.com/api/docs/changelog",
    githubUrl: "https://github.com/openai/openai-node",
    sourceType: "docs_page",
    importanceBand: "critical",
  },
  {
    id: "openai-codex-review",
    slug: "openai-codex-review-mode-updates",
    vendorSlug: "openai",
    title: "OpenAI extends Codex review workflows",
    summary: "Codex shipped stronger review and task handling behavior for developer workflows.",
    whatChanged: "Codex adds richer review-oriented behavior around implementation loops, with clearer handoff behavior for coding tasks.",
    whyItMatters: "Teams experimenting with AI-assisted implementation can revisit where Codex fits in their review path and how much work they let it carry autonomously.",
    whoShouldCare: ["ai", "backend", "product"],
    affectedStack: ["llms", "agents", "developer-workflow"],
    categories: ["model", "api"],
    publishedAt: "2026-04-18T12:00:00.000Z",
    sourceUrl: "https://developers.openai.com/codex/changelog",
    sourceType: "changelog_page",
    importanceBand: "high",
  },
  {
    id: "anthropic-batches",
    slug: "anthropic-expands-message-batch-controls",
    vendorSlug: "anthropic",
    title: "Anthropic expands message batch controls",
    summary: "Anthropic refined batch behavior and clarified output handling for larger automation workflows.",
    whatChanged: "The API release notes add clearer batch processing behavior and more guidance on how to manage higher-volume runs.",
    whyItMatters: "Teams using Claude for asynchronous processing or queue-based automations need to recheck throughput assumptions and response handling.",
    whoShouldCare: ["backend", "ai", "infra"],
    affectedStack: ["llms", "agents", "background-jobs"],
    categories: ["api", "model"],
    publishedAt: "2026-04-18T15:40:00.000Z",
    sourceUrl: "https://platform.claude.com/docs/en/release-notes/overview",
    sourceType: "docs_page",
    importanceBand: "high",
  },
  {
    id: "anthropic-prompt-caching",
    slug: "anthropic-adjusts-prompt-caching-behavior",
    vendorSlug: "anthropic",
    title: "Anthropic adjusts prompt caching guidance",
    summary: "Prompt caching guidance was tightened with clearer boundaries on what is cache-friendly and what is not.",
    whatChanged: "Anthropic revised prompt caching notes to make reuse boundaries and optimization expectations more explicit.",
    whyItMatters: "If teams have tuned latency and cost around prompt caching, they should verify that their assumptions still line up with the recommended implementation.",
    whoShouldCare: ["ai", "backend"],
    affectedStack: ["llms", "cost-control"],
    categories: ["docs", "api"],
    publishedAt: "2026-04-17T17:25:00.000Z",
    sourceUrl: "https://support.anthropic.com/en/articles/12138966-release-notes",
    sourceType: "changelog_page",
    importanceBand: "medium",
  },
  {
    id: "gemini-grounding",
    slug: "gemini-grounding-and-tool-updates",
    vendorSlug: "gemini",
    title: "Gemini updates grounding and tool configuration behavior",
    summary: "Google tightened the way grounding and tool settings are described for Gemini API integrations.",
    whatChanged: "The Gemini API changelog highlights updated guidance and behavior around tool use and grounded responses.",
    whyItMatters: "AI products that rely on grounded answers or tool orchestration should confirm request configuration before behavior drifts in production.",
    whoShouldCare: ["ai", "backend", "product"],
    affectedStack: ["llms", "agents", "search"],
    categories: ["api", "model"],
    publishedAt: "2026-04-18T13:20:00.000Z",
    sourceUrl: "https://ai.google.dev/gemini-api/docs/changelog",
    sourceType: "docs_page",
    importanceBand: "high",
  },
  {
    id: "vercel-runtime",
    slug: "vercel-preview-runtime-controls",
    vendorSlug: "vercel",
    title: "Vercel adds finer preview runtime controls",
    summary: "Vercel exposed more explicit controls for preview environment runtime behavior.",
    whatChanged: "Preview deployment runtime settings now surface more predictable operational controls for non-production environments.",
    whyItMatters: "Teams leaning on preview deployments for QA or platform validation can tighten staging behavior without touching production defaults.",
    whoShouldCare: ["infra", "frontend"],
    affectedStack: ["hosting", "deployments"],
    categories: ["infra"],
    publishedAt: "2026-04-18T10:30:00.000Z",
    sourceUrl: "https://vercel.com/changelog",
    sourceType: "changelog_page",
    importanceBand: "medium",
  },
  {
    id: "vercel-ai-sdk-streams",
    slug: "vercel-ai-sdk-stream-shape-clarifications",
    vendorSlug: "vercel",
    title: "Vercel clarifies AI SDK stream shaping",
    summary: "Vercel refined AI SDK guidance for structured streams and output handling.",
    whatChanged: "The changelog now sets clearer expectations for how structured streaming should be handled across generated UI surfaces.",
    whyItMatters: "Teams shipping chat, agent, or generation interfaces with Vercel AI SDK should confirm that their stream rendering path still matches the recommended contract.",
    whoShouldCare: ["frontend", "ai", "backend"],
    affectedStack: ["llms", "developer-workflow", "frontend-infra"],
    categories: ["sdk", "api"],
    publishedAt: "2026-04-17T19:05:00.000Z",
    sourceUrl: "https://vercel.com/changelog",
    githubUrl: "https://github.com/vercel/ai",
    sourceType: "changelog_page",
    importanceBand: "high",
  },
  {
    id: "stripe-subscription-schedules",
    slug: "stripe-subscription-schedule-changes",
    vendorSlug: "stripe",
    title: "Stripe updates subscription schedule phase end-date computation",
    sourceTitle: "Updates computation of subscription schedule phase end date to consider billing cycle anchor changes",
    summary: "Stripe now considers billing cycle anchor changes when it computes subscription schedule phase end dates.",
    whatChanged: "When a subscription schedule phase omits an explicit end date, Stripe now factors billing_cycle_anchor changes into the computed end_date instead of relying only on interval values and the previous phase end date.",
    whyItMatters: "Teams that depend on Stripe's automatic phase end-date calculation can see different billing transitions on new schedules and should verify any migration, preview, or proration logic built around the older formula.",
    whoShouldCare: ["backend", "product"],
    affectedStack: ["payments", "subscriptions"],
    categories: ["breaking", "api"],
    publishedAt: "2025-09-30T00:00:00.000Z",
    sourceUrl: "https://docs.stripe.com/changelog/clover/2025-09-30/billing-cycle-anchor-resets-during-phase-computation",
    githubUrl: "https://github.com/stripe/stripe-node",
    sourceType: "changelog_page",
    importanceBand: "high",
  },
  {
    id: "stripe-billing-notices",
    slug: "stripe-expands-billing-notice-controls",
    vendorSlug: "stripe",
    title: "Stripe expands billing notice controls",
    summary: "Stripe added more control around billing communications and notice timing.",
    whatChanged: "The billing surface now exposes more explicit behavior around notifications and customer-facing notice timing.",
    whyItMatters: "Subscription teams with compliance or retention requirements may need to revisit how Stripe-managed communications line up with their product logic.",
    whoShouldCare: ["backend", "product", "compliance"],
    affectedStack: ["payments", "subscriptions", "email"],
    categories: ["pricing", "api"],
    publishedAt: "2026-04-17T18:15:00.000Z",
    sourceUrl: "https://docs.stripe.com/changelog",
    sourceType: "changelog_page",
    importanceBand: "medium",
  },
  {
    id: "github-actions-runners",
    slug: "github-hosted-runner-networking-changes",
    vendorSlug: "github",
    title: "GitHub updates hosted runner networking expectations",
    summary: "GitHub published runner changes that affect Actions networking assumptions.",
    whatChanged: "The changelog covers hosted runner behavior that can change how CI jobs reach internal or external services.",
    whyItMatters: "Teams with private package mirrors, VPN-bound resources, or locked-down CI routing should confirm that job assumptions still hold.",
    whoShouldCare: ["infra", "backend", "security"],
    affectedStack: ["ci-cd", "developer-workflow", "networking"],
    categories: ["infra", "security"],
    publishedAt: "2026-04-18T11:20:00.000Z",
    sourceUrl: "https://github.blog/changelog/",
    githubUrl: "https://github.com/actions/runner",
    sourceType: "blog",
    importanceBand: "high",
  },
  {
    id: "cloudflare-workers",
    slug: "cloudflare-workers-platform-adjustments",
    vendorSlug: "cloudflare",
    title: "Cloudflare updates Workers platform controls",
    summary: "Cloudflare rolled out Workers platform adjustments for runtime behavior.",
    whatChanged: "Workers gained new platform controls affecting runtime defaults and deployment behavior.",
    whyItMatters: "Teams shipping on Workers should confirm runtime assumptions, rollout behavior, and any environment-specific defaults they depend on.",
    whoShouldCare: ["infra", "backend"],
    affectedStack: ["hosting", "deployments", "edge-compute"],
    categories: ["infra", "api"],
    publishedAt: "2026-04-18T08:15:00.000Z",
    sourceUrl: "https://developers.cloudflare.com/changelog/",
    sourceType: "changelog_page",
    importanceBand: "medium",
  },
  {
    id: "cloudflare-do-limits",
    slug: "cloudflare-durable-objects-storage-limit-changes",
    vendorSlug: "cloudflare",
    title: "Cloudflare revises Durable Objects storage guidance",
    summary: "Cloudflare changed the way storage constraints and operational guidance are described for Durable Objects.",
    whatChanged: "The changelog reframed guidance for Durable Objects storage and behavior under heavier stateful workloads.",
    whyItMatters: "Stateful edge systems using Durable Objects should review capacity assumptions before traffic spikes expose brittle data patterns.",
    whoShouldCare: ["infra", "backend"],
    affectedStack: ["edge-compute", "storage", "realtime"],
    categories: ["sdk", "infra"],
    publishedAt: "2026-04-17T14:10:00.000Z",
    sourceUrl: "https://developers.cloudflare.com/changelog/",
    githubUrl: "https://github.com/cloudflare/workerd",
    sourceType: "changelog_page",
    importanceBand: "high",
  },
  {
    id: "cursor-agents",
    slug: "cursor-agent-layout-updates",
    vendorSlug: "cursor",
    title: "Cursor expands multi-agent workspace controls",
    summary: "Cursor expanded multi-agent workspace controls and session layout behavior.",
    whatChanged: "Cursor improved agent workspace organization for concurrent coding sessions and heavier repo context.",
    whyItMatters: "Frequent Cursor users can manage more agent-heavy workflows with less UI friction, but team conventions may need to catch up.",
    whoShouldCare: ["ai", "frontend"],
    affectedStack: ["agents", "developer-workflow"],
    categories: ["model", "infra"],
    publishedAt: "2026-04-18T09:45:00.000Z",
    sourceUrl: "https://cursor.com/changelog/",
    sourceType: "changelog_page",
    importanceBand: "medium",
  },
  {
    id: "cursor-repo-rules",
    slug: "cursor-tightens-repo-rule-controls",
    vendorSlug: "cursor",
    title: "Cursor tightens repo rule controls",
    summary: "Cursor added stronger controls around repo-specific instruction handling.",
    whatChanged: "Repo-level rules and instruction handling got stricter so teams can steer agent behavior more predictably.",
    whyItMatters: "Organizations using Cursor across shared repositories should check whether their current rule sets still produce the behavior they expect.",
    whoShouldCare: ["ai", "backend", "engineering-management"],
    affectedStack: ["agents", "developer-workflow", "governance"],
    categories: ["model", "policy"],
    publishedAt: "2026-04-17T16:40:00.000Z",
    sourceUrl: "https://cursor.com/changelog/",
    sourceType: "changelog_page",
    importanceBand: "high",
  },
  {
    id: "supabase-branching",
    slug: "supabase-branch-lifecycle-updates",
    vendorSlug: "supabase",
    title: "Supabase updates branch lifecycle controls",
    summary: "Supabase expanded how branch lifecycle behavior is handled in development workflows.",
    whatChanged: "Branching controls and related environment guidance were updated to better reflect multi-environment database workflows.",
    whyItMatters: "Teams relying on branch-based preview databases should verify merge, teardown, and branch retention assumptions.",
    whoShouldCare: ["backend", "infra"],
    affectedStack: ["database", "deployments"],
    categories: ["infra", "sdk"],
    publishedAt: "2026-04-18T07:40:00.000Z",
    sourceUrl: "https://supabase.com/changelog",
    githubUrl: "https://github.com/supabase/supabase",
    sourceType: "changelog_page",
    importanceBand: "medium",
  },
  {
    id: "firebase-docs",
    slug: "firebase-release-note-example-refresh",
    vendorSlug: "firebase",
    title: "Firebase refreshes release note examples",
    summary: "Firebase refreshed release note examples and explanatory docs copy.",
    whatChanged: "Firebase updated documentation examples and related explanation text without signaling a major runtime behavior change.",
    whyItMatters: "This looks like a docs-level refresh rather than a production-impacting release, but it can still change how developers interpret the SDK surface.",
    whoShouldCare: ["frontend", "mobile"],
    affectedStack: ["database", "mobile"],
    categories: ["docs"],
    publishedAt: "2026-04-17T16:00:00.000Z",
    sourceUrl: "https://firebase.google.com/support/release-notes",
    sourceType: "docs_page",
    importanceBand: "low",
  },
  {
    id: "apple-xcode-sdk",
    slug: "apple-revises-xcode-sdk-migration-notes",
    vendorSlug: "apple-developer",
    title: "Apple revises Xcode SDK migration notes",
    summary: "Apple revised Xcode release note sections that affect SDK migration planning.",
    whatChanged: "The Xcode release notes were revised to make migration expectations more explicit for recent SDK and tooling changes.",
    whyItMatters: "Apple platform teams should confirm whether their current release train is exposed to any newly clarified toolchain or SDK constraints.",
    whoShouldCare: ["mobile", "ios", "infra"],
    affectedStack: ["mobile", "ios", "tooling"],
    categories: ["sdk", "policy"],
    publishedAt: "2026-04-18T10:10:00.000Z",
    sourceUrl: "https://developer.apple.com/news/releases/rss/releases.rss",
    sourceType: "docs_page",
    importanceBand: "high",
  },
  {
    id: "android-behavior",
    slug: "android-platform-behavior-change-roundup",
    vendorSlug: "android-developers",
    title: "Android highlights behavior changes for the current platform cycle",
    summary: "Android updated behavior change guidance that affects app runtime expectations.",
    whatChanged: "The platform release notes make behavior changes more explicit for the current Android cycle, especially where apps can break silently.",
    whyItMatters: "Mobile teams need to validate background behavior, permissions, and compatibility paths before the next target SDK update becomes urgent.",
    whoShouldCare: ["mobile", "android", "product"],
    affectedStack: ["mobile", "android", "compliance"],
    categories: ["breaking", "policy"],
    publishedAt: "2026-04-18T09:10:00.000Z",
    sourceUrl: "https://developer.android.com/about/versions/17/release-notes?hl=en",
    sourceType: "docs_page",
    importanceBand: "critical",
  },
  {
    id: "firecrawl-extraction",
    slug: "firecrawl-improves-logo-extraction-branding-format-v2",
    vendorSlug: "firecrawl",
    title: "Firecrawl improves logo extraction for Branding Format v2",
    sourceTitle: "Improved Logo Extraction for Branding Format v2",
    summary: "Firecrawl improved the reliability of logo detection in its Branding Format v2 output.",
    whatChanged: "Firecrawl reports more accurate logo extraction, better handling of logos embedded in background images, and improved support for sites built with tools like Wix and Framer.",
    whyItMatters: "Teams using Firecrawl to power brand enrichment or website intelligence can expect fewer false positives and less custom cleanup around extracted logos and identity data.",
    whoShouldCare: ["ai", "backend"],
    affectedStack: ["agents", "scraping", "search"],
    categories: ["api", "docs"],
    publishedAt: "2026-02-06T00:00:00.000Z",
    sourceUrl: "https://www.firecrawl.dev/changelog",
    githubUrl: "https://github.com/firecrawl/firecrawl",
    sourceType: "changelog_page",
    importanceBand: "medium",
  },
  {
    id: "exa-ranking",
    slug: "exa-introduces-monitors",
    vendorSlug: "exa",
    title: "Exa introduces recurring search monitors",
    sourceTitle: "Introducing Exa Monitors",
    summary: "Exa added recurring monitors that run searches on a schedule and deliver deduplicated results to a webhook.",
    whatChanged: "Exa launched a monitor primitive with interval scheduling, webhook delivery, deduplication between runs, and optional structured output schemas for search results.",
    whyItMatters: "Teams using Exa for competitive tracking, research feeds, or agent pipelines can move from manual polling to scheduled updates that push only new results into downstream systems.",
    whoShouldCare: ["ai", "backend"],
    affectedStack: ["search", "agents", "webhooks"],
    categories: ["api", "automation"],
    publishedAt: "2026-03-30T00:00:00.000Z",
    sourceUrl: "https://exa.ai/docs/changelog",
    sourceType: "docs_page",
    importanceBand: "medium",
  },
  {
    id: "clerk-org-tokens",
    slug: "clerk-api-keys-general-availability",
    vendorSlug: "clerk",
    title: "Clerk makes API keys generally available",
    sourceTitle: "API Keys General Availability",
    summary: "Clerk's API keys are now generally available with usage-based billing enabled.",
    whatChanged: "Clerk promoted API keys to general availability as part of its machine authentication suite and published pricing, enablement guidance, and backend SDK references for key creation and verification.",
    whyItMatters: "Teams building delegated machine access or service-to-service flows on Clerk can now rely on a stable API key surface, but they also need to account for the new billing model and rollout settings.",
    whoShouldCare: ["backend", "security", "frontend"],
    affectedStack: ["auth", "security", "machine-access"],
    categories: ["api", "security"],
    publishedAt: "2026-04-17T00:00:00.000Z",
    sourceUrl: "https://clerk.com/changelog/2026-04-17-api-keys-ga",
    githubUrl: "https://github.com/clerk/javascript",
    sourceType: "changelog_page",
    importanceBand: "high",
  },
  {
    id: "resend-webhooks",
    slug: "resend-expands-suppression-webhook-signals",
    vendorSlug: "resend",
    title: "Resend expands suppression webhook signals",
    summary: "Resend expanded suppression-related webhook coverage for sending teams.",
    whatChanged: "The changelog adds broader webhook signals for suppression and deliverability-related states.",
    whyItMatters: "Email teams can improve routing and recovery flows, but existing webhook consumers may need to handle additional states cleanly.",
    whoShouldCare: ["backend", "growth", "product"],
    affectedStack: ["email", "webhooks"],
    categories: ["api", "sdk"],
    publishedAt: "2026-04-17T13:55:00.000Z",
    sourceUrl: "https://resend.com/changelog",
    sourceType: "changelog_page",
    importanceBand: "medium",
  },
  {
    id: "linear-import",
    slug: "linear-adds-issue-import-automation-controls",
    vendorSlug: "linear",
    title: "Linear adds issue import automation controls",
    summary: "Linear introduced more explicit controls for issue import and automation-heavy workflows.",
    whatChanged: "The changelog details broader automation hooks and import controls for teams moving work into Linear.",
    whyItMatters: "Engineering teams with pipeline-driven triage or migration work should review how these controls change their workflow assumptions.",
    whoShouldCare: ["product", "engineering-management", "backend"],
    affectedStack: ["issue-tracking", "automation"],
    categories: ["api", "infra"],
    publishedAt: "2026-04-17T12:40:00.000Z",
    sourceUrl: "https://linear.app/changelog",
    sourceType: "changelog_page",
    importanceBand: "medium",
  },
  {
    id: "docker-networking",
    slug: "docker-desktop-revises-networking-defaults",
    vendorSlug: "docker",
    title: "Docker Desktop revises networking defaults",
    summary: "Docker updated Desktop networking defaults and related guidance.",
    whatChanged: "The release notes revise how Docker Desktop documents and applies certain networking defaults for local development.",
    whyItMatters: "Teams that depend on specific localhost, DNS, or bridge assumptions should validate local environments before onboarding drift spreads.",
    whoShouldCare: ["backend", "infra", "developer-experience"],
    affectedStack: ["containers", "networking", "developer-workflow"],
    categories: ["breaking", "infra"],
    publishedAt: "2026-04-17T11:30:00.000Z",
    sourceUrl: "https://docs.docker.com/desktop/release-notes/",
    sourceType: "docs_page",
    importanceBand: "high",
  },
];

export const events: MockEvent[] = eventSeeds.map((event) => {
  const source = findVendorSourceForEvent(event);

  return {
    ...event,
    vendorName: vendorNameBySlug.get(event.vendorSlug) ?? event.vendorSlug,
    sourceName: event.sourceName ?? vendorSourceNameByUrl.get(event.sourceUrl) ?? source?.name,
    sourceSurfaceUrl: event.sourceSurfaceUrl ?? source?.url ?? event.sourceUrl,
    sourceSurfaceName: event.sourceSurfaceName ?? source?.name ?? event.sourceName,
    sourceSurfaceType: event.sourceSurfaceType ?? source?.type ?? event.sourceType,
  };
});

export const reviewCandidates: ReviewCandidate[] = [
  {
    id: "candidate-openai-1",
    vendorSlug: "openai",
    vendorName: "OpenAI",
    title: "OpenAI updates API changelog formatting and migration notes",
    sourceType: "docs_page",
    publishedAt: "2026-04-18T17:10:00.000Z",
    status: "pending_review",
    parseConfidence: "medium",
    rawBody: "Model update note with docs surface changes and partial migration hints.",
  },
  {
    id: "candidate-apple-1",
    vendorSlug: "apple-developer",
    vendorName: "Apple",
    title: "Apple revises Xcode release note sections",
    sourceType: "docs_page",
    publishedAt: "2026-04-18T11:00:00.000Z",
    status: "pending_review",
    parseConfidence: "low",
    rawBody: "Docs-heavy change that may represent an in-place release note revision.",
  },
  {
    id: "candidate-docker-1",
    vendorSlug: "docker",
    vendorName: "Docker",
    title: "Docker Desktop note references new compatibility caveat",
    sourceType: "docs_page",
    publishedAt: "2026-04-18T08:50:00.000Z",
    status: "pending_review",
    parseConfidence: "medium",
    rawBody: "Desktop release note revision that may affect VPN-heavy local setups.",
  },
  {
    id: "candidate-linear-1",
    vendorSlug: "linear",
    vendorName: "Linear",
    title: "Linear adjusts automation note wording",
    sourceType: "changelog_page",
    publishedAt: "2026-04-17T18:20:00.000Z",
    status: "pending_review",
    parseConfidence: "high",
    rawBody: "Potentially meaningful automation update, but still needs confirmation against the official note.",
  },
];

export const sourceHealth: SourceHealthEntry[] = [
  { vendorName: "OpenAI", sourceName: "API Changelog", status: "healthy", lastSuccessAt: "2026-04-18T17:30:00.000Z" },
  { vendorName: "Anthropic", sourceName: "Platform Release Notes", status: "healthy", lastSuccessAt: "2026-04-18T17:00:00.000Z" },
  { vendorName: "Vercel", sourceName: "Vercel Changelog", status: "healthy", lastSuccessAt: "2026-04-18T16:40:00.000Z" },
  { vendorName: "Stripe", sourceName: "Stripe Changelog", status: "healthy", lastSuccessAt: "2026-04-18T16:20:00.000Z" },
  { vendorName: "Apple", sourceName: "Developer Releases", status: "healthy", lastSuccessAt: "2026-04-17T12:00:00.000Z" },
  { vendorName: "Android", sourceName: "Android Release Notes", status: "healthy", lastSuccessAt: "2026-04-18T06:00:00.000Z" },
  { vendorName: "Firebase", sourceName: "JavaScript SDK Release Notes", status: "healthy", lastSuccessAt: "2026-04-18T04:00:00.000Z" },
  { vendorName: "Docker", sourceName: "Docker Desktop Release Notes", status: "healthy", lastSuccessAt: "2026-04-16T21:15:00.000Z" },
];
