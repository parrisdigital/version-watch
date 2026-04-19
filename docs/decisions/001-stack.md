# Decision 001: Stack

## Decision

Version Watch uses:

- Next.js App Router
- Convex
- Vercel
- GitHub

## Rationale

### Next.js

Chosen for:

- strong App Router page architecture
- SEO-friendly public routes
- easy pairing with Vercel
- clear separation between public surfaces and protected admin surfaces

### Convex

Chosen for:

- integrated backend functions
- document-relational data model that fits vendors, sources, events, and review logs
- built-in cron scheduling for ingestion
- strong fit for a solo-maintained fullstack app

### Vercel

Chosen for:

- straightforward Next.js hosting
- preview deployment workflow
- production hosting simplicity

### GitHub

Chosen for:

- source control
- PR-based workflow
- preview deployment trigger source
- future deployment and release hygiene

## Rejected For V1

### Plain Postgres + ORM

Rejected because:

- it adds more backend plumbing for a solo-maintained project
- Convex covers the data plus backend-function plus scheduling story with less setup

### Supabase or Neon as the primary backend

Rejected because:

- the app benefits more from Convex’s integrated function and cron model than from plain hosted Postgres in v1

### Separate cron infrastructure

Rejected because:

- Convex cron jobs are sufficient for v1 ingestion scheduling

## Consequences

- all backend data and scheduling decisions must remain Convex-native
- implementation docs must not assume Drizzle, Prisma, or direct SQL as the main backend path
