# Roadmap

## Phase 0: Documentation Package

Deliverables:

- product brief
- architecture
- data model
- vendor registry
- design direction
- ops and repo workflow
- Convex-native implementation plan

Exit criteria:

- no open architecture decisions remain
- docs are internally consistent

## Phase 1: Project Scaffold

Deliverables:

- Next.js app shell
- Convex initialization
- baseline routing
- shared styling and layout foundation

Exit criteria:

- app boots locally
- Convex connected
- public and protected route groups exist

## Phase 2: Core Data And Backend

Deliverables:

- Convex schema
- seed data for vendors and sources
- public queries
- admin review mutations
- ingestion actions
- cron job definitions

Exit criteria:

- schema stable
- vendor registry loaded
- a source can be fetched into a pending review candidate

## Phase 3: Public Product Surfaces

Deliverables:

- homepage
- vendor pages
- event pages
- search
- about page

Exit criteria:

- published events render correctly
- homepage ranking works
- vendor pages default to chronological order

## Phase 4: Review And Ops Surfaces

Deliverables:

- review login
- review queue
- review detail page
- ops health page

Exit criteria:

- admin can approve, edit, reject, or suppress
- source health is visible

## Phase 5: Ingestion Reliability

Deliverables:

- parser coverage for Tier A vendors
- generic list parser for simpler vendors
- docs parser for docs-heavy vendors
- dedupe and failure logging

Exit criteria:

- all Tier A vendors ingesting successfully
- at least one source per Tier B vendor ingesting successfully

## Phase 6: Design Polish And Launch Prep

Deliverables:

- homepage visual polish
- motion pass for allowed surfaces
- performance review
- launch QA

Exit criteria:

- no generic dashboard regressions
- no source attribution gaps
- launch checklist cleared
