# Architecture

## System Summary

Version Watch uses a split architecture:

- **Next.js App Router** renders the public website and the protected admin UI
- **Convex** stores product data and runs backend logic
- **Convex actions** fetch and normalize external source content
- **Convex cron jobs** schedule recurring ingestion
- **Vercel** hosts the web app and handles preview/production web deployments

## Primary Subsystems

### Public web app

Responsibilities:

- render homepage, vendor pages, event pages, search, and about
- render review/admin pages behind a secret-based guard
- provide polished information architecture and premium utility-first design

Implementation posture:

- Next.js App Router
- server-rendered route shells for SEO and first paint
- client islands where live filters or review actions benefit from subscriptions

### Convex data layer

Responsibilities:

- store vendors, sources, raw ingestion candidates, published events, review actions, and ingestion logs
- expose public read queries
- expose admin mutations
- expose actions for external network fetch and normalization

### Ingestion runtime

Responsibilities:

- poll official sources on a fixed schedule
- parse structured data or HTML/RSS content
- deduplicate candidate updates
- classify and score items
- enqueue candidates for review

Implementation posture:

- Convex cron jobs trigger internal actions/mutations
- actions handle external fetches
- mutations persist normalized state transitions

### Review runtime

Responsibilities:

- gate all public publication in v1
- let one admin approve, edit, reject, or suppress events
- record decisions for traceability

## Convex Function Boundaries

### Queries

Use queries for:

- published homepage feed
- published vendor feed
- event detail read
- vendor directory
- search result read model
- review queue read
- health/status reads

### Mutations

Use mutations for:

- admin login session bookkeeping if needed
- approve and publish
- edit and publish
- reject
- suppress
- seed vendors and sources
- update source health state

### Actions

Use actions for:

- fetching external source pages or feeds
- fetching GitHub-linked release data
- parsing remote HTML/RSS
- generating deterministic normalized fields from raw source data

### Internal functions

Cron jobs should call internal functions only. Public clients should never invoke ingestion or review write paths directly.

## Cron Model

Use Convex cron jobs for:

- Tier A source polling every 4 hours
- Tier B source polling every 12 hours
- daily deep-diff processing every 24 hours
- optional periodic cleanup of stale raw candidates

Cron jobs should fan out into source-specific processing rather than contain parsing logic directly.

## Publication Lifecycle

1. Source poll discovers candidate content
2. Convex action extracts a normalized candidate
3. Candidate is deduped
4. Candidate is stored with score, tags, and `pending_review`
5. Admin reviews candidate
6. Approved candidates become `published`
7. Rejected or noisy items become `rejected` or `suppressed`

## Admin Protection

V1 admin protection uses a simple secret:

- login page accepts `ADMIN_SECRET`
- successful login sets a signed httpOnly cookie
- Next.js middleware blocks `/review` and `/ops/*` without a valid session

No third-party auth provider is used in v1.

## Deployment Boundaries

### Vercel owns

- Next.js hosting
- preview deployments for pull requests
- production deployment for the web app
- web environment variables

### Convex owns

- backend data
- function execution
- cron scheduling
- ingestion runtime
- backend logs and schedule visibility

### GitHub owns

- source control
- PR workflow
- merge history
- repository automation later if needed

## Failure Modes

### Source fetch failure

- mark failure on the ingestion run
- increment source error count
- keep previous published content untouched

### Parser breakage

- do not publish malformed events
- send item to failure state or suppressed state
- show degraded source in ops health

### Duplicate detection failure

- dedupe by stable source key before writing public candidate
- never publish two events with same vendor plus source plus external identity

### Review backlog growth

- public site remains stable because unpublished items never leak through
- ops page surfaces pending volume and oldest pending age
