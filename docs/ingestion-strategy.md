# Ingestion Strategy

## Approach

Version Watch uses a hybrid ingestion model:

- structured source polling for release-note and changelog surfaces
- selective GitHub-linked source ingestion where useful
- periodic deep-diff checks for doc-heavy sources

The system is intentionally curated rather than open-ended.

## Source Adapter Types

### GitHub release adapter

Use when a vendor exposes meaningful GitHub releases or tags.

Best for:

- repo-backed tools
- SDK release streams
- products with reliable release metadata

### Changelog page adapter

Use when a vendor maintains a clear chronological release page.

Best for:

- Vercel
- Stripe
- Clerk
- Resend
- Cursor
- Linear

### Docs page adapter

Use when official updates live in release-note docs rather than a clean changelog.

Best for:

- Apple Developer
- Android Developers
- Firebase
- Exa docs changelog

### Blog adapter

Use when the official announcement surface is a product update post and no stronger changelog exists.

### RSS adapter

Use only when the RSS feed is official and materially cleaner than HTML scraping.

## Processing Pipeline

1. Cron selects due sources
2. Source-specific action fetches remote content
3. Parser extracts candidate records
4. Deduper compares each candidate against existing keys
5. Classifier applies tags and importance
6. Candidate is written to `rawCandidates`
7. Review queue exposes the candidate for manual decision

## Dedupe Rules

Primary key:

- vendor slug
- source ID
- external ID

Fallback key:

- normalized title
- normalized source URL
- raw published date

Never dedupe across vendors.

## Fetch Cadence

- Tier A sources: every 4 hours
- Tier B sources: every 12 hours
- Deep diff for docs-heavy sources: every 24 hours

## Deep-Diff Use

Deep diff is only for sources that frequently update in place without clear per-entry records.

Apply to:

- Apple Developer release note pages when needed
- Android docs-heavy release pages
- Firebase release note hubs if entry extraction becomes noisy

## Error Handling

On failure:

- store failed `ingestionRun`
- increment source failure count
- keep source active unless repeated failures indicate structural breakage

Escalate source to degraded state when:

- three consecutive failures occur
- parser returns obviously malformed candidates repeatedly

## Retry Policy

- one immediate lightweight retry for transient network failures
- no repeated hammering inside the same run
- next scheduled run handles persistent failures

## Parser Strategy

- custom parser for important/high-volume vendors
- generic list parser for structured changelog pages
- docs parser for documentation-heavy release note pages

## Anti-Goals

- no arbitrary web search ingestion in v1
- no scraping of unofficial commentary sites
- no AI-generated discovery from social feeds
