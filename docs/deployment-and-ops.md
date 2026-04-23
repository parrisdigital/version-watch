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

Required:

- `NEXT_PUBLIC_CONVEX_URL`
- `CONVEX_DEPLOYMENT`
- `ADMIN_SECRET`
- `GITHUB_TOKEN`
- `INGESTION_USER_AGENT`
- `INGESTION_ENABLED`

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
4. Run a forced production ingestion refresh when parser or dedupe logic changed
5. Run `npm run health:production`
6. Browser-check homepage, vendor, search, and event back-navigation flows
7. Cron jobs continue using the production Convex environment

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
- recent ingestion runs contain failures
- top public events include noisy parser artifacts
- public events are future-dated or not returned newest first

The defaults are intentionally strict enough for the four-hour ingestion cadence. They can be tuned with
`SINCE_HOURS`, `MAX_SOURCE_LAG_HOURS`, `MAX_LATEST_EVENT_AGE_HOURS`, `MAX_FUTURE_SKEW_HOURS`, and
`EVENT_LIMIT`.

### Automated monitoring

GitHub Actions runs `.github/workflows/production-health.yml`:

- every four hours at minute 23
- after pushes to `main`, with a short wait for the production deploy window
- manually through `workflow_dispatch`
- on PRs that change the monitor, health script, package metadata, or production freshness query

A failed run is the alert. It shows up in the GitHub Actions UI and in normal GitHub notification surfaces for
the repository. The first response is to check whether production ingestion failed, whether a source is stale,
or whether parser noise made it into the top feed.

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

## Backups And Recovery

V1 posture:

- rely on Convex persistence and logs
- keep source definitions in code
- keep docs and implementation plan in git

Later:

- add structured backup/export policy for published change events
