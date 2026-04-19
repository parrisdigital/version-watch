# Product Brief

## Product

**Name:** Version Watch  
**Subtitle:** Change intelligence for developers

Version Watch is a public website that helps developers understand important platform and tooling changes without reading every vendor changelog manually.

## Why This Exists

Developer teams are buried in fragmented change surfaces:

- official changelog pages
- release notes hubs
- GitHub releases
- documentation diffs
- product announcement posts

The problem is not just finding updates. The problem is deciding:

- what changed
- whether it matters
- who needs to act
- where the original evidence lives

Version Watch exists to turn fragmented release noise into a small number of high-signal, source-linked change events.

## Audience

Primary audience:

- independent developers
- startup engineers
- technical founders
- platform and infra-minded product teams

Secondary audience:

- agencies
- developer advocates
- engineering leads tracking tooling risk

## Product Promise

Version Watch should let a developer answer these questions quickly:

- What important platform changes happened this week?
- What changed for Stripe, OpenAI, Vercel, or Cursor recently?
- Is this a breaking change, pricing change, model change, or docs-only update?
- Which team or role should care?
- Where is the official source and any related GitHub release or repo link?

## Success Criteria

Version Watch is successful when:

- a developer can scan the homepage in under 30 seconds and find the most important current changes
- vendor pages feel like reliable source hubs instead of generic feeds
- event pages are concise, source-first, and actionable
- the review queue keeps noisy or misleading updates out of the public feed
- the site remains inexpensive and maintainable by one person

## Non-Goals

Version Watch is not:

- a monetized SaaS in v1
- a social product
- a newsletter CMS
- a generic RSS reader
- a full media editorial operation
- a realtime alerting platform for teams

## Core Principles

- **Source-first:** every public event links back to an official source
- **Utility-first:** public pages should optimize for scanning and verification
- **Curated breadth:** cover the biggest relevant developer platforms, not everything
- **Manual trust layer:** public publication in v1 always passes through a solo review queue
- **Rule-based v1:** summaries and tags are produced through deterministic extraction and templates, not LLM dependence

## Core User Flows

### Public discovery

1. User lands on the homepage
2. Scans the most important recent changes
3. Filters by vendor, category, or date
4. Opens an event detail page or vendor page

### Vendor monitoring

1. User visits a vendor page
2. Reviews the latest updates in chronological order
3. Opens the source links or GitHub links for verification

### Deep event understanding

1. User opens an event page
2. Reads:
   - what changed
   - why it matters
   - who should care
   - affected stack
3. Clicks through to official source material

### Solo curation

1. Admin checks the review queue
2. Reviews raw source material and proposed normalized event
3. Approves, edits, rejects, or suppresses the item
4. Published items become visible on public pages
