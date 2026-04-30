# Information Architecture

## Page Inventory

### Public pages

- `/`
- `/vendors`
- `/vendors/[vendorSlug]`
- `/events/[eventSlug]`
- `/search`
- `/about`

### Protected admin pages

- `/review/login`
- `/review`
- `/review/[id]`
- `/ops/health`

## Homepage

**Purpose:** Show the most important current changes across the ecosystem.

### Required sections

- premium navigation bar
- hero with product name, subtitle, and search/filter entry
- importance-ranked featured feed
- compact vendor access strip/grid
- filterable latest change list
- short explainer showing the four normalized fields
- final CTA and footer

### Homepage defaults

- sort: importance-ranked
- time window: latest 30 days
- event visibility: published only
- filters available:
  - vendor
  - category
  - importance band
  - affected stack
  - date range

### Homepage event card content

- vendor
- title
- published date
- category chips
- importance band
- one-sentence summary
- source count
- direct source link

## Vendor Index Page

**Purpose:** Provide a single jump-off surface for all tracked vendors.

### Required content

- alphabetical vendor list
- tier marker
- vendor description
- most recent published update date
- direct link to vendor page

## Vendor Page

**Purpose:** Act as the canonical public hub for one vendor.

### Required content

- vendor name and description
- official source links
- feed of published events in chronological order
- vendor-specific filters by category and date
- source health note if a source is degraded

### Vendor page defaults

- sort: newest first
- event visibility: published only
- hero treatment: restrained and denser than homepage

## Event Page

**Purpose:** Show the canonical normalized record for a single change event.

### Required content

- title
- vendor
- published date
- discovered date
- importance band
- what changed
- why it matters
- who should care
- affected stack
- category tags
- official source link
- optional GitHub links
- related recent events from the same vendor

### Event page rules

- must privilege official source verification
- must not bury the source link below decorative content
- must never read like a long-form article

## Search Page

**Purpose:** Help users find events by vendor, category, stack, or text query.

### Required behavior

- text query over title, summary, tags, and vendor
- filter by vendor
- filter by category
- filter by affected stack
- filter by date range
- results sorted by date unless user chooses importance

## About Page

**Purpose:** Explain what Version Watch is and what it is not.

### Required content

- concise mission statement
- explanation of source-first methodology
- explanation of review process
- note that public summaries should be verified against official source material

## Review Login Page

**Purpose:** Allow the site owner to access the protected review area.

### Required behavior

- accept admin secret
- set signed httpOnly admin session cookie
- redirect to `/review` on success
- no public discoverability from nav

## Review Queue

**Purpose:** Triage ingested but unpublished items.

### Required fields in list view

- vendor
- title
- source type
- published date
- importance score
- review status
- parser confidence note

### Required actions

- open detail
- approve and publish
- edit then publish
- reject
- suppress

## Review Detail

**Purpose:** Review one candidate event in full.

### Required content

- raw title and raw body
- source URL
- parsed fields
- generated normalized fields
- event links
- importance score breakdown
- edit form for public fields

## Ops Health

**Purpose:** Provide visibility into ingestion system health.

### Required content

- last successful run by source
- failing sources
- stale sources
- pending review counts
- suppressed item counts

## Navigation Rules

- Public nav should link only to useful public surfaces
- Admin surfaces should never appear in public nav
- Vendor and event pages should keep search/filter access visible
- Footer should remain minimal and utility-focused
