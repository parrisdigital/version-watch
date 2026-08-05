# Deployment And Ops

## Hosting Model

Version Watch uses a split deployment model.

### Vercel

Owns:

- Next.js web app hosting
- preview deployments for pull requests
- production web deployment
- frontend environment variables

### Convex

Owns:

- application data
- backend functions
- ingestion actions
- cron scheduling
- source lifecycle state and source health history
- backend logs and function health

## Environments

### Local

- local Next.js dev server
- Convex dev deployment
- local admin secret
- local GitHub token for testing GitHub-backed source fetches

### Preview

- Vercel preview deployment on pull request
- Convex preview or development deployment for test data
- non-production admin secret

### Production

- Vercel production deployment from `main`
- dedicated Convex production deployment
- production cron jobs active

## Environment Variables

Application variables:

- `NEXT_PUBLIC_CONVEX_URL`
- `NEXT_PUBLIC_SITE_URL`
- `CONVEX_DEPLOYMENT`
- `ADMIN_SECRET`
- `INGESTION_USER_AGENT`

Workflow and script variables:

- `CONVEX_DEPLOY_KEY`
- `VERSION_WATCH_URL`
- `CONVEX_URL`

Optional later:

- `SENTRY_DSN`
- `VERCEL_GIT_COMMIT_SHA`

Feedback submissions are stored in Convex under `feedbackSubmissions`. No email provider or API key is
required for the MVP feedback loop.

## Deployment Flow

### Preview deployments

1. Open pull request in GitHub
2. Vercel creates preview deployment
3. Preview is used for UI review
4. Convex preview/dev deployment is used only for safe test data

### Production deployments

1. Merge approved PR to `main`
2. Vercel deploys the web app
3. Convex production deployment is updated
4. Run a forced production ingestion refresh when parser, source lifecycle, or dedupe logic changed
5. Run `npm run health:production`
6. Browser-check homepage, vendor, search, and event back-navigation flows
7. Cron jobs continue using the production Convex environment

The web app reads public API data from Convex snapshots. Updating Next.js on Vercel does not deploy
Convex functions, schema changes, or cron definitions by itself. When a change touches `convex/`,
production is not complete until the Convex production deployment has also been updated.

GitHub owns Convex deployment through `.github/workflows/convex-production.yml` once the repository has
GitHub Environments named `development` and `production`, each with an environment-scoped
`CONVEX_DEPLOY_KEY` secret. The workflow fails clearly when the deploy key is missing.

## Cron Ownership

Cron jobs live in Convex, not Vercel.

Why:

- ingestion is backend-owned
- source scheduling belongs next to the data and actions
- deployment of web and cron should remain separable

## Operational Responsibilities

### Daily

- check review queue
- check degraded sources
- check stale source timestamps
- run `npm run health:production` when a deploy or forced refresh changes feed behavior

### Production freshness check

`npm run health:production` queries the production Convex deployment and fails when:

- the latest public event is stale
- active sources have not succeeded recently
- no recent feed refresh run exists or the latest completed refresh is stale
- top public events include noisy parser artifacts
- public events are future-dated or not returned newest first

It warns, without failing, when recent refresh or ingestion runs contain recovered transient failures.

Paused and unsupported sources are excluded from active freshness debt. This is intentional: a source
that cannot be fetched reliably should not make the platform look broken as long as the public coverage
state is honest. Active and degraded sources remain part of the monitored set.

The public API exposes the same operating contract at `/api/v1/status`:

- `healthy`: latest refresh is inside the expected window and active sources are clean
- `degraded`: refresh is recent, but active source coverage is incomplete or a refresh was partial
- `stale`: no acceptable refresh completed inside the freshness window

The defaults are intentionally strict enough for the four-hour ingestion cadence. They can be tuned with
`SINCE_HOURS`, `MAX_SOURCE_LAG_HOURS`, `MAX_LATEST_EVENT_AGE_HOURS`, `MAX_FUTURE_SKEW_HOURS`, and
`EVENT_LIMIT`.

### Automated monitoring

Convex owns the primary automation:

- `scheduled-ingestion` runs every 15 minutes and fetches only sources currently due
- `daily-deep-diff` runs at 02:30 UTC and also records a completed refresh batch
- `refresh-watchdog` runs every 30 minutes and forces a recovery refresh if no completed refresh batch has been recorded within the freshness window

Source freshness tiers decide when each source is due:

- `critical`: every 30 minutes for top reliable developer-platform sources
- `high`: every 60 minutes for important platform sources
- `standard`: every 4 hours for normal monitored sources
- `long_tail`: every 12 hours for lower-priority docs and blog surfaces

Failed sources use exponential backoff with a circuit-breaker delay after repeated failures. Sources can
also store `ETag`, `Last-Modified`, and `contentHash` metadata so unchanged responses avoid unnecessary
parsing.

GitHub Actions runs `.github/workflows/production-health.yml`:

- every four hours at minute 23
- manually through `workflow_dispatch`
- records route latency, payload size, and exact public event count for every run
- uploads the capacity snapshot as a 90-day GitHub Actions artifact

The production HTTP monitor fails when a route exceeds its response-time or payload budget, or when the
public event count passes the 10,000-event capacity-review boundary. It begins warning at 70% of each
budget so sitemap or route growth is visible before the hard gate. The GitHub step summary provides the
current snapshot; retained `production-http-metrics-*` artifacts provide the run-by-run history.

GitHub Actions also includes `.github/workflows/convex-production.yml`:

- manually deploys the shared `development` Convex environment through `workflow_dispatch`
- deploys the `production` Convex environment on pushes to `main` that touch `convex/**`, package metadata, or the workflow itself
- runs `npm test` before deploy
- enforces the rollback compatibility safety window before deploy
- deploys with `npx convex deploy --typecheck try`
- fails clearly when the selected GitHub environment does not define `CONVEX_DEPLOY_KEY`
- runs production freshness after production Convex deploy and the production web deploy window

A failed run is the alert. It shows up in the GitHub Actions UI and in normal GitHub notification surfaces for
the repository. The first response is to check whether production ingestion failed, whether a source is stale,
or whether parser noise made it into the top feed.

### Rollback compatibility removal

The bounded `events:listPublic` and `events:byVendorSlug` functions remain temporarily available for rollback
to a pre-pagination frontend. `npm run rollback:gate` prevents either function from being removed before
August 12, 2026 in America/Toronto and prevents partial removal at any time.

After the date gate opens, remove both functions together only when all of the following are true:

1. Convex deploy, production HTTP, freshness, source-link, and vendor-coverage jobs remained green for a full week.
2. No active Vercel production deployment references either compatibility query.
3. A repository search confirms no application call site references either function.
4. The current paginated frontend has been production-verified immediately before removal.

After removal, deploy Convex production, rerun the HTTP and data-quality workflows, and retain the previous
known-good deployment until the verification completes.

### Weekly

- review suppressed items for pattern drift
- confirm vendor sources still match current public surfaces
- spot-check homepage ranking quality

### Parser incidents

When a parser breaks:

1. mark source degraded
2. stop trusting new output from that source
3. leave existing published events intact
4. patch parser before resuming normal ingestion

### Source lifecycle incidents

Use source lifecycle state to keep the public coverage set honest:

- `active`: source is polled and counted in public freshness
- `degraded`: source is still polled but recently failing or stale
- `paused`: source is intentionally not polled and not counted as active freshness debt
- `unsupported`: source is known but lacks a reliable machine-readable surface

No current first-party registry source is intentionally unsupported. If a vendor loses its reliable
machine-readable surface, mark the source `unsupported`, document the reason here, and keep historical
events public while avoiding active-monitoring claims until the source returns to `active`.

## Backups And Recovery

V1 posture:

- rely on Convex persistence and logs
- keep source definitions in code
- keep docs and implementation plan in git

Later:

- add structured backup/export policy for published change events
