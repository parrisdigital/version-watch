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
4. Cron jobs continue using the production Convex environment

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
