# Vendor Registry

Version Watch tracks official source surfaces for developer platforms, frameworks, AI tools, infrastructure services, and adjacent workflow products.

The authoritative registry lives in [`src/lib/mock-data.ts`](../src/lib/mock-data.ts). Public pages and APIs read from the seeded Convex registry in production, while this document explains the standards used to add and maintain vendors.

## Current Coverage

The public registry currently covers 90 vendors. Coverage is grouped into:

- AI Models & APIs
- AI Coding Agents
- Editors & IDEs
- Hosting & Edge
- Design Systems & UI
- Frameworks & Tooling
- Auth
- Databases
- Mobile
- Dev Workflow
- Browsers
- Observability
- Payments & Email
- Search & Web Data

Recent AI-coding and platform additions include Lovable, Bolt, Tabnine, Sourcegraph Cody, Gemini Code Assist, Amazon Q Developer, JetBrains Junie, GitHub Copilot, CodeRabbit, Qodo, Continue, OpenHands, Goose, Aider, Roo Code, Kiro, Amp, Replit Agent, v0, OpenRouter, Mistral AI, Perplexity, Figma, Model Context Protocol, Base UI, HeroUI, and TanStack. These use official machine-readable release feeds where available; sources without a stable machine-readable surface stay explicitly unsupported instead of degrading production health.

## Registry Rules

- Every vendor must have at least one official source URL.
- Prefer machine-readable feeds when the vendor exposes them: RSS, Atom, GitHub releases, or raw changelog files.
- Use a custom parser only when a high-value source does not expose a stable feed.
- Do not add brittle scraped sources when an official feed is missing or currently broken.
- Vendor slugs should remain stable after publication so public URLs and API filters do not break.
- Renames should preserve the existing slug when possible and update the display name, description, source, logo, and source-link audit rules.
- Logo assets should render clearly in light and dark mode.

## Source Types

- `rss`: RSS or Atom feeds, preferred when available.
- `github_release`: GitHub release pages or repository release feeds.
- `changelog_page`: chronological product changelog pages.
- `docs_page`: documentation release notes.
- `blog`: official product or engineering blog feeds.

## Review Checklist

Before adding a vendor:

1. Confirm the source is official and public.
2. Confirm the source returns fresh content without authentication.
3. Prefer a direct feed over a rendered docs page.
4. Add category, logo, affected-stack metadata, and auto-publish eligibility when appropriate.
5. Add or adjust parser tests for non-feed sources.
6. Run local tests, build, source coverage, vendor coverage, production health, and secret scanning before deployment.

## Maintenance Notes

The registry intentionally favors reliable official surfaces over breadth. If a vendor has a visible changelog page but no stable feed, add it only after confirming the parser is robust enough for production health checks.

Detailed ingestion behavior is documented in [Ingestion strategy](./ingestion-strategy.md), [Classification and ranking](./classification-and-ranking.md), and [Deployment and ops](./deployment-and-ops.md).
