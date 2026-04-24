# Data Model

## Modeling Approach

Version Watch uses Convex as a document-relational backend. Each major concept is stored in a dedicated table with explicit references between records.

## Core Tables

### `vendors`

One document per tracked vendor.

**Fields**

- `slug`
- `name`
- `description`
- `tier` with `a | b`
- `homepageUrl`
- `logoMode` with `light | dark | neutral`
- `isActive`
- `sortOrder`
- `createdAt`
- `updatedAt`

### `sources`

One document per official source URL.

**Fields**

- `vendorId`
- `name`
- `sourceType`
- `url`
- `isPrimary`
- `pollIntervalMinutes`
- `parserKey`
- `isActive`
- `lastSuccessAt`
- `lastFailureAt`
- `consecutiveFailures`
- `notes`
- `createdAt`
- `updatedAt`

### `rawCandidates`

Stores normalized source discoveries before publication decisions.

**Fields**

- `vendorId`
- `sourceId`
- `externalId`
- `sourceUrl`
- `githubUrl`
- `rawTitle`
- `rawBody`
- `rawPublishedAt`
- `discoveredAt`
- `checksum`
- `parseConfidence`
- `normalizationVersion`
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

### `changeEvents`

Public canonical events. Created when a raw candidate is approved.

**Fields**

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
- `categories`
- `importanceScore`
- `importanceBand`
- `publishedAt`
- `discoveredAt`
- `sourceUrl`
- `githubUrl`
- `visibility`
- `createdAt`
- `updatedAt`

### `eventLinks`

Normalized auxiliary links related to an event.

**Fields**

- `changeEventId`
- `linkType`
- `label`
- `url`
- `sortOrder`

### `reviewActions`

Audit trail for admin review decisions.

**Fields**

- `rawCandidateId`
- `action`
- `notes`
- `performedAt`
- `performedBy`
- `diffSnapshot`

### `ingestionRuns`

Log of source processing attempts.

**Fields**

- `sourceId`
- `vendorId`
- `startedAt`
- `finishedAt`
- `status`
- `itemsFetched`
- `itemsCreated`
- `itemsDeduped`
- `errorMessage`
- `runType`

### `refreshRuns`

Batch-level log of each full feed refresh cycle. This is the authoritative source for the public
`Feed refreshed` timestamp and production freshness monitor.

**Fields**

- `startedAt`
- `finishedAt`
- `status`
- `runType`
- `force`
- `reason`
- `sourcesProcessed`
- `itemsFetched`
- `itemsCreated`
- `itemsDeduped`
- `published`
- `failures`
- `errorMessage`

## Enumerations

### `sourceType`

- `github_release`
- `changelog_page`
- `docs_page`
- `blog`
- `rss`

### `rawCandidate.status`

- `pending_review`
- `published`
- `rejected`
- `suppressed`

### `changeEvents.visibility`

- `public`
- `hidden`

### `reviewActions.action`

- `approve`
- `edit_publish`
- `reject`
- `suppress`

### `importanceBand`

- `critical`
- `high`
- `medium`
- `low`

## Relationship Rules

- one vendor has many sources
- one source has many ingestion runs
- one source can produce many raw candidates
- one raw candidate can produce at most one published change event
- one change event can have many event links
- one raw candidate can have many review actions

## Required Uniqueness

- `vendors.slug` unique
- `sources.vendorId + sources.url` unique
- `rawCandidates.dedupeKey` unique
- `changeEvents.slug` unique

## Dedupe Model

The canonical dedupe key is:

`vendorSlug + sourceId + externalId`

Fallback when no stable external ID exists:

`vendorSlug + normalizedSourceUrl + normalizedTitle + rawPublishedAt`

## Public Read Model Rules

Homepage and vendor pages read only from `changeEvents` where:

- `visibility = public`
- source vendor is active

The homepage additionally sorts by importance unless filters override it.

## Convex Schema Notes

Implementation should define these tables in `convex/schema.ts` with:

- explicit validators for every field
- indexes for `vendorId`, `publishedAt`, `importanceBand`, `status`, and `sourceId`
- compound indexes for common reads, especially:
  - events by vendor and date
  - candidates by status and date
  - sources by vendor
  - ingestion runs by source and start time
