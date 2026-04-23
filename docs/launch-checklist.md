# Launch Checklist

## Product

- homepage clearly communicates the product in the first screen
- homepage defaults to importance-ranked results
- vendor pages list events alphabetically by title
- event pages expose source links clearly
- event pages return to the originating feed for homepage, vendor, and search flows

## Source Coverage

- every launch vendor has at least one official source configured
- Tier A vendors ingest reliably
- Docker scope is explicitly limited to Docker Desktop in v1
- Apple, Android, and Firebase doc-heavy sources are monitored for parser fragility

## Review

- review queue works end to end
- approve/edit/reject/suppress flows all persist correctly
- unpublished candidates never appear publicly

## Classification

- category taxonomy matches the docs
- role tags match the docs
- affected stack tags match the docs
- importance bands match the scoring rules

## Design

- no generic SaaS hero cards
- no six-line hero headline
- no cheap meta labels
- button contrast is correct
- vendor and event pages are quieter than the homepage

## Motion

- GSAP is limited to approved surfaces
- reduced motion is respected
- no horizontal scroll introduced by motion

## Deployment

- Vercel preview deployments work from PRs
- Convex deployment is connected correctly
- cron jobs are active in the intended environment
- required environment variables are set
- `npm run health:production` passes after production deploys and forced refreshes
- GitHub Actions production health monitor is enabled on schedule, push, manual dispatch, and monitor PRs

## Operations

- source health page shows failing sources
- stale source timestamps are visible
- parser failures do not create public garbage
- production freshness checks flag stale feeds, noisy titles, future-dated events, and recent ingestion failures
- failed production health workflow runs are treated as operational alerts

## Documentation

- README matches implemented stack
- architecture and implementation plan are still aligned
- any implementation deviations are reflected in docs before launch
