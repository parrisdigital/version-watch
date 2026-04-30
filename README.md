# Version Watch

Version Watch is a public developer utility for tracking meaningful changes across major developer platforms. It collects official release notes, changelogs, docs updates, RSS feeds, blogs, and GitHub release signals, then normalizes them into searchable update records.

The current app is live product code, not a pre-build docs package.

## What It Shows

Public update records answer:

- what changed
- why it matters
- who should care
- which platform or stack area is affected
- where the official source lives
- how confident and urgent the signal is

Updates are displayed as event cards and canonical event pages. Each card shows the vendor, source type, release class, severity, publish time, summary, tags, signal score, and links back to the official detail. Event pages add deeper context, citation helpers, source provenance, neighboring vendor updates, and structured feedback.

## Public Surfaces

- `/` - importance-ranked recent updates
- `/search` - searchable and filterable update explorer
- `/vendors` and `/vendors/[slug]` - vendor directory and vendor-specific feeds
- `/events/[slug]` - canonical update pages
- `/feedback` - public correction and feedback form
- `/agent-access` - human-readable API and agent integration guide
- `/api/v1/updates` - paginated JSON updates
- `/api/v1/clusters` - grouped update bursts for alerting and digests
- `/api/v1/feed.json` and `/api/v1/feed.md` - feed formats
- `/api/v1/status` and `/api/v1/status/vendors` - freshness and source health
- `/api/v1/taxonomy` - valid vendors, severities, tags, audiences, and release classes
- `/api/v1/openapi.json` - OpenAPI contract
- `/agents.md`, `/llms.txt`, `/llms-full.txt`, and `/skills/version-watch/SKILL.md` - agent-facing context

## Release Classes

Version Watch classifies updates into:

- `breaking`
- `security`
- `model_launch`
- `pricing`
- `policy`
- `api_change`
- `sdk_release`
- `cli_patch`
- `beta_release`
- `docs_update`
- `routine_release`

Severity is represented as `critical`, `high`, `medium`, or `low`. Public feeds can be filtered by `vendor`, `severity`, `release_class`, `audience`, `tag`, `since`, `cursor`, and `limit`.

## Stack

- Next.js App Router
- React
- TypeScript
- Convex for data, ingestion, review workflows, cron jobs, and health state
- Vercel for web hosting and previews
- GitHub Actions for Convex deployment and production freshness checks
- Vitest and Playwright for automated checks

This repository keeps `"private": true` in `package.json` because it is an application, not an npm package. That flag does not control GitHub repository visibility.

## Local Setup

```bash
npm ci
cp .env.example .env.local
npm run dev
```

Local public pages can run without `NEXT_PUBLIC_CONVEX_URL`; the app falls back to bundled sample data outside production. Production requires a Convex deployment URL.

Useful commands:

```bash
npm run lint
npm test
npm run test:e2e
npm run health:production
npm run signal:production
npm run sources:production
npm run vendors:production
```

## Environment

Application variables:

- `NEXT_PUBLIC_SITE_URL` - canonical public site URL, for example `https://versionwatch.dev`
- `NEXT_PUBLIC_CONVEX_URL` - public Convex deployment URL; required in production
- `CONVEX_DEPLOYMENT` - Convex CLI deployment name for local development
- `ADMIN_SECRET` - server-side secret for admin pages, review actions, and protected admin APIs
- `INGESTION_USER_AGENT` - optional user agent used by Convex ingestion fetches

GitHub Actions environment secrets:

- `CONVEX_DEPLOY_KEY` - Convex deploy key for the `development` and `production` GitHub Environments
- `ADMIN_SECRET` - same production admin secret used by protected operational workflows

Do not commit real `.env` files, deploy keys, API tokens, webhook URLs, or production admin secrets. Use `.env.local`, Vercel environment variables, Convex environment variables, and GitHub Environment secrets.

## Open Source Status

This repository is being prepared for public release. Before changing GitHub visibility from private to public:

- run a full secret scan across the current tree and git history
- rotate any key that was ever committed, even if it has since been deleted
- add a real open source license
- confirm GitHub secret scanning and push protection are enabled
- confirm Vercel, Convex, and GitHub Actions secrets are environment-scoped
- review `docs/open-source-checklist.md`

## Documentation

- [Changelog](./CHANGELOG.md)
- [Open source checklist](./docs/open-source-checklist.md)
- [Release process](./docs/release-process.md)
- [Product brief](./docs/product-brief.md)
- [Architecture](./docs/architecture.md)
- [Data model](./docs/data-model.md)
- [Vendor registry](./docs/vendor-registry.md)
- [Classification and ranking](./docs/classification-and-ranking.md)
- [Content guidelines](./docs/content-guidelines.md)
- [Review operations](./docs/review-operations.md)
- [Ingestion strategy](./docs/ingestion-strategy.md)
- [Deployment and ops](./docs/deployment-and-ops.md)
- [Repo workflow](./docs/repo-workflow.md)
- [Roadmap](./docs/roadmap.md)

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md). Public contributions should focus on source coverage, parser quality, docs, tests, and public API reliability. Admin workflows and production secrets stay private.

## Security

See [SECURITY.md](./SECURITY.md). Please report vulnerabilities privately instead of opening public issues.

## License

Version Watch is released under the [MIT License](./LICENSE).
