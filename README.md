# Version Watch

Version Watch is a public, non-monetized developer utility for tracking meaningful changes across major developer platforms.

**Subtitle:** Change intelligence for developers

The product collects official release notes, changelogs, docs updates, and GitHub-linked release signals from major vendors, then normalizes them into a consistent public record:

- what changed
- why it matters
- who should care
- what part of the stack is affected
- where the official source lives

## Product Shape

Version Watch is intentionally not a newsletter business, social product, or generic RSS reader. It is a source-first utility with three primary public surfaces:

- importance-ranked homepage
- chronological vendor pages
- canonical event pages

Version Watch also includes a protected solo review queue used to approve, edit, reject, or suppress newly ingested events before they are published.

## Locked Stack

- Next.js App Router
- Convex for backend data, queries, mutations, actions, and cron jobs
- Vercel for web hosting and preview deployments
- GitHub-first repo and PR workflow

## Documentation Map

- [Product brief](./docs/product-brief.md)
- [Information architecture](./docs/information-architecture.md)
- [Architecture](./docs/architecture.md)
- [Data model](./docs/data-model.md)
- [Vendor registry](./docs/vendor-registry.md)
- [Classification and ranking](./docs/classification-and-ranking.md)
- [Content guidelines](./docs/content-guidelines.md)
- [Review operations](./docs/review-operations.md)
- [Ingestion strategy](./docs/ingestion-strategy.md)
- [Design direction](./docs/design-direction.md)
- [Motion and interaction](./docs/motion-and-interaction.md)
- [Deployment and ops](./docs/deployment-and-ops.md)
- [Repo workflow](./docs/repo-workflow.md)
- [Roadmap](./docs/roadmap.md)
- [Launch checklist](./docs/launch-checklist.md)
- [Stack decision](./docs/decisions/001-stack.md)
- [Design decision](./docs/decisions/002-design-direction.md)
- [Implementation plan](./docs/plans/2026-04-18-change-intelligence-implementation.md)

## Current Phase

This folder currently holds the pre-build documentation package. The next phase is app scaffolding and implementation against the locked decisions in the docs.

## Environment Plan

The implementation phase should assume these environment variables:

- `NEXT_PUBLIC_CONVEX_URL`
- `NEXT_PUBLIC_SITE_URL`
- `CONVEX_DEPLOYMENT`
- `ADMIN_SECRET`
- `GITHUB_TOKEN`
- `INGESTION_USER_AGENT`
- `INGESTION_ENABLED`

Optional later:

- `SENTRY_DSN`
- `VERCEL_ENV`

## Local Setup Plan

When implementation begins:

1. Initialize the Next.js app in this project root.
2. Initialize Convex in the same repo.
3. Add the public pages and admin review surfaces.
4. Add the vendor registry and ingestion logic.
5. Wire Convex cron jobs for polling.
6. Deploy previews through Vercel and connect the production deployment after the review queue is stable.

## Design Guardrails

The public design must follow the direction in:

- [Design direction](./docs/design-direction.md)
- [Motion and interaction](./docs/motion-and-interaction.md)

Implementation is expected to use:

- `[$gpt-taste](/Users/matthewparris/.agents/skills/gpt-taste/SKILL.md)`
- `[@build-web-apps](plugin://build-web-apps@openai-curated)`
- `[@vercel](plugin://vercel@openai-curated)`
- `[@github](plugin://github@openai-curated)`
- `[$convex](/Users/matthewparris/.codex/skills/convex/SKILL.md)` and relevant Convex sub-skills
