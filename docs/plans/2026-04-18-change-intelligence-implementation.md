# Version Watch Implementation Plan

> **For Claude:** REQUIRED SUB-SKILLS: Use `[$convex](/Users/matthewparris/.codex/skills/convex/SKILL.md)`, `[@vercel](plugin://vercel@openai-curated)`, `[@github](plugin://github@openai-curated)`, `[@build-web-apps](plugin://build-web-apps@openai-curated)`, and `[$gpt-taste](/Users/matthewparris/.agents/skills/gpt-taste/SKILL.md)` during implementation.

**Goal:** Build Version Watch, a public non-monetized developer utility that turns official platform updates into reviewed, source-linked change events.

**Architecture:** Next.js App Router renders the public site and protected review surfaces. Convex stores vendors, sources, raw candidates, review decisions, and published events; Convex actions fetch and normalize external sources; Convex cron jobs schedule ingestion. Vercel hosts the web app and GitHub drives repo and preview workflows.

**Tech Stack:** Next.js, TypeScript, Convex, Tailwind CSS, GSAP, Playwright, Vitest, Vercel, GitHub.

---

### Task 1: Bootstrap The App

**Files:**
- Create: `package.json`
- Create: `next.config.ts`
- Create: `tsconfig.json`
- Create: `convex/`
- Create: `src/app/layout.tsx`
- Create: `src/app/page.tsx`
- Create: `src/styles/globals.css`
- Create: `.env.example`
- Create: `README.md`

**Step 1: Create the app shell**

Initialize a Next.js app in the current workspace with TypeScript and the App Router.

**Step 2: Add the minimum dependencies**

Install:
- `next`
- `react`
- `react-dom`
- `convex`
- `@convex-dev/eslint-plugin`
- `clsx`
- `tailwindcss`
- `gsap`
- `@gsap/react`
- `zod`
- `date-fns`
- `cheerio`
- `rss-parser`

Dev dependencies:
- `typescript`
- `vitest`
- `@vitest/coverage-v8`
- `playwright`
- `eslint`

**Step 3: Add environment placeholders**

Add:
- `NEXT_PUBLIC_CONVEX_URL`
- `CONVEX_DEPLOYMENT`
- `ADMIN_SECRET`
- `GITHUB_TOKEN`
- `INGESTION_USER_AGENT`
- `INGESTION_ENABLED`

**Step 4: Verify the app boots**

Run: `npm run dev`
Expected: Next.js app loads with a placeholder homepage.

### Task 2: Initialize Convex And Define The Schema

**Files:**
- Create: `convex/schema.ts`
- Create: `convex/vendors.ts`
- Create: `convex/sources.ts`
- Create: `convex/events.ts`
- Create: `convex/review.ts`
- Create: `convex/ingestionRuns.ts`

**Step 1: Define core tables**

Create tables for:
- `vendors`
- `sources`
- `rawCandidates`
- `changeEvents`
- `eventLinks`
- `reviewActions`
- `ingestionRuns`

**Step 2: Include fields required by the product**

`vendors`:
- `id`
- `slug`
- `name`
- `tier`
- `homepageUrl`
- `isActive`

`sources`:
- `id`
- `vendorId`
- `sourceType`
- `name`
- `url`
- `pollIntervalMinutes`
- `parserKey`
- `isActive`

`rawCandidates`:
- `id`
- `vendorId`
- `sourceId`
- `externalId`
- `rawTitle`
- `rawBody`
- `sourceUrl`
- `githubUrl`
- `rawPublishedAt`
- `discoveredAt`
- `proposedSummary`
- `proposedWhatChanged`
- `proposedWhyItMatters`
- `proposedWhoShouldCare`
- `proposedAffectedStack`
- `proposedCategories`
- `importanceScore`
- `importanceBand`
- `status`
- `dedupeKey`

`changeEvents`:
- `id`
- `vendorId`
- `sourceId`
- `rawCandidateId`
- `slug`
- `title`
- `summary`
- `whatChanged`
- `whyItMatters`
- `whoShouldCare`
- `affectedStack`
- `importanceScore`
- `importanceBand`
- `publishedAt`
- `discoveredAt`
- `sourceUrl`
- `githubUrl`
- `visibility`

**Step 3: Add Convex indexes**

Add indexes for:

- events by vendor and date
- events by importance and date
- candidates by status and date
- sources by vendor
- ingestion runs by source and start time

### Task 3: Configure Convex Functions

**Files:**
- Create: `convex/public.ts`
- Create: `convex/internal.ts`
- Create: `convex/http.ts`

**Step 1: Define public read queries**

Create queries for:

- homepage feed
- vendor list
- vendor page feed
- event detail
- search
- health summaries for admin

**Step 2: Define admin mutations**

Create mutations for:

- approve and publish
- edit and publish
- reject
- suppress

**Step 3: Define ingestion actions**

Create actions for:

- fetch source
- normalize candidates
- persist ingestion results

### Task 4: Seed The Vendor Registry

**Files:**
- Create: `src/config/vendors.ts`
- Create: `convex/seed.ts`

**Step 1: Add launch vendors**

Seed these vendors:
- OpenAI
- Anthropic
- Google Gemini
- Vercel
- Stripe
- GitHub
- Cloudflare
- Supabase
- Cursor
- Firebase
- Apple Developer
- Android Developers
- Firecrawl
- Exa
- Clerk
- Resend
- Linear
- Docker

**Step 2: Assign tiers**

Tier A:
- OpenAI
- Anthropic
- Gemini
- Vercel
- Stripe
- GitHub
- Cloudflare
- Cursor

Tier B:
- Supabase
- Firebase
- Apple Developer
- Android Developers
- Firecrawl
- Exa
- Clerk
- Resend
- Linear
- Docker

**Step 3: Add official source URLs**

Every vendor entry must include at least one official changelog or release-notes URL and optional GitHub/repo URLs.

### Task 5: Build Source Fetchers

**Files:**
- Create: `convex/ingest/fetchHtml.ts`
- Create: `convex/ingest/fetchRss.ts`
- Create: `convex/ingest/fetchGithubReleases.ts`
- Create: `convex/ingest/types.ts`

**Step 1: Create generic fetch interfaces**

Normalize raw fetch output into a common structure:
- `externalId`
- `title`
- `url`
- `publishedAt`
- `body`
- `metadata`

**Step 2: Implement GitHub release ingestion**

Use the GitHub API for vendors with release-backed repos where practical.

**Step 3: Implement HTML and RSS ingestion**

Use HTML selectors and RSS feeds for official changelog pages.

**Step 4: Add fetch timeout and error handling**

Record fetch failures into `ingestion_runs`.

### Task 6: Build Vendor Parsers

**Files:**
- Create: `convex/ingest/parsers/index.ts`
- Create: `convex/ingest/parsers/openai.ts`
- Create: `convex/ingest/parsers/anthropic.ts`
- Create: `convex/ingest/parsers/vercel.ts`
- Create: `convex/ingest/parsers/stripe.ts`
- Create: `convex/ingest/parsers/genericList.ts`
- Create: `convex/ingest/parsers/docsPage.ts`

**Step 1: Start with high-value vendors**

Implement custom parsers first for:
- OpenAI
- Anthropic
- Vercel
- Stripe
- GitHub
- Cloudflare

**Step 2: Add a generic fallback parser**

This should work for simple list-based changelog pages.

**Step 3: Deduplicate by vendor plus source plus external ID**

If no external ID exists, hash source URL plus title plus publish date.

### Task 7: Add Classification And Scoring

**Files:**
- Create: `src/lib/classification/tags.ts`
- Create: `src/lib/classification/score.ts`
- Create: `src/lib/classification/enrich.ts`
- Create: `src/lib/classification/__tests__/score.test.ts`

**Step 1: Define launch categories**

Categories:
- `breaking`
- `deprecation`
- `api`
- `model`
- `sdk`
- `pricing`
- `policy`
- `security`
- `infra`
- `docs`

**Step 2: Define role and stack tags**

Role tags:
- `frontend`
- `backend`
- `mobile`
- `infra`
- `ai`
- `product`

Stack tags:
- `payments`
- `auth`
- `hosting`
- `agents`
- `llms`
- `mobile-platform`
- `database`
- `email`
- `workflow`

**Step 3: Implement a simple scoring formula**

Score based on:
- source type
- category weight
- vendor tier
- freshness
- presence of linked GitHub evidence

**Step 4: Write scoring tests**

Run: `npm test -- score`
Expected: breaking and deprecation items rank above docs-only items.

### Task 8: Build The Review Queue

**Files:**
- Create: `src/app/review/page.tsx`
- Create: `src/app/review/[id]/page.tsx`
- Create: `src/app/review/login/page.tsx`
- Create: `src/middleware.ts`
- Create: `src/lib/admin/session.ts`

**Step 1: Add a review list page**

Display:
- vendor
- title
- source
- suggested score
- status

**Step 2: Add a detail page**

Show:
- raw source text
- generated summary
- tags
- official links
- GitHub links

**Step 3: Add review actions**

Support:
- approve
- reject
- edit then approve
- suppress

**Step 4: Protect the review area**

Use a simple admin secret:

- login page accepts `ADMIN_SECRET`
- signed httpOnly cookie is set on success
- middleware guards `/review` and `/ops`

### Task 9: Build The Public Pages

**Files:**
- Create: `src/app/vendors/page.tsx`
- Create: `src/app/vendors/[slug]/page.tsx`
- Create: `src/app/events/[slug]/page.tsx`
- Create: `src/app/search/page.tsx`
- Create: `src/app/about/page.tsx`
- Create: `src/components/event-card.tsx`
- Create: `src/components/filter-bar.tsx`
- Create: `src/components/vendor-grid.tsx`
- Modify: `src/app/page.tsx`

**Step 1: Build the homepage**

Homepage should show:
- headline
- search
- importance-ranked event feed
- vendor shortcuts
- filters
- premium utility-first hero following the design docs

**Step 2: Build vendor pages**

Vendor pages should show:
- official source links
- chronological event feed
- vendor metadata

**Step 3: Build event pages**

Each page should show:
- title
- date
- what changed
- why it matters
- who should care
- affected stack
- source link
- GitHub links

### Task 10: Add Design System And Motion Layer

**Files:**
- Create: `src/components/site-nav.tsx`
- Create: `src/components/homepage-hero.tsx`
- Create: `src/components/homepage-explainer.tsx`
- Create: `src/lib/motion/`
- Modify: `src/styles/globals.css`

**Step 1: Follow the design docs**

Apply:

- wide hero typography
- premium but restrained homepage art direction
- no generic hero cards
- no cheap section labels

**Step 2: Add homepage-only motion**

Use GSAP selectively for:

- hero entrance
- explainer section
- controlled hover physics

**Step 3: Keep utility surfaces quiet**

Vendor, event, search, and admin pages should use restrained transitions only.

### Task 11: Add Scheduled Ingestion

**Files:**
- Create: `convex/crons.ts`
- Create: `convex/ingest/runIngestion.ts`
- Create: `convex/ingest/processSource.ts`

**Step 1: Implement the ingestion runner**

Loop through active sources and process them according to cadence.

**Step 2: Configure schedule**

Recommended launch cadence:
- Tier A: every 4 hours
- Tier B: every 12 hours
- daily deep-diff run: once per day

**Step 3: Ensure cron functions call internal functions only**

### Task 12: Add Search And Basic Observability

**Files:**
- Create: `src/lib/search/query-events.ts`
- Create: `src/app/ops/health/page.tsx`

**Step 1: Add basic search**

Search by:
- vendor
- title
- category
- affected stack

**Step 2: Add health checks**

Display:
- last successful ingestion run
- sources failing repeatedly
- number of pending reviews

### Task 13: Add Tests And Verification

**Files:**
- Create: `convex/ingest/parsers/__tests__/genericList.test.ts`
- Create: `tests/smoke/homepage.spec.ts`
- Create: `tests/smoke/vendor-page.spec.ts`
- Create: `tests/smoke/review-queue.spec.ts`

**Step 1: Parser tests**

Validate the generic parser against fixture HTML.

**Step 2: Homepage smoke test**

Verify homepage loads and shows event cards.

**Step 3: Vendor page smoke test**

Verify vendor page renders official links and event list.

**Step 4: Review queue smoke test**

Verify protected review route gating and admin queue rendering.

**Step 5: Run the test suite**

Run:
- `npm test`
- `npx playwright test`

Expected:
- parser tests pass
- smoke tests pass

### Task 14: Deployment And Launch Readiness

**Files:**
- Modify: `README.md`
- Create: `docs/launch-checklist.md`
- Create: `vercel.json`

**Step 1: Document operations**

Document:
- how to add a new vendor
- how to update source URLs
- how to handle parser breakage
- how review publishing works

**Step 2: Add launch checklist**

Checklist should include:
- all Tier A vendors ingesting successfully
- at least one approved event for every launch vendor
- homepage filters working
- event pages linking to official sources
- Convex cron jobs working on schedule

**Step 3: Manual pre-launch review**

Check that public copy clearly states:
- this is a public utility
- summaries are linked to official sources
- users should verify production-impacting changes in the original source
