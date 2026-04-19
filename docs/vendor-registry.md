# Vendor Registry

## Launch Coverage Summary

Version Watch launches with 18 vendors across AI, developer workflow, platform infrastructure, backend services, and mobile platforms.

### Tier A

- OpenAI
- Anthropic
- Google Gemini
- Vercel
- Stripe
- GitHub
- Cloudflare
- Cursor

### Tier B

- Supabase
- Firebase
- Apple Developer
- Android Developers
- Firecrawl
- Exa
- Clerk
- Resend
- Linear
- Docker

## Registry Rules

- every vendor must have at least one official source URL
- every vendor must have a locked tier
- every source must declare a source type, cadence, parser strategy, and risk level
- Tier A sources get first parser investment and first review attention

## Vendor Definitions

### OpenAI

- Tier: A
- Primary sources:
  - `https://platform.openai.com/docs/changelog`
  - `https://help.openai.com/en/articles/11428266-codex-changelog/`
- Source types: `docs_page`, `changelog_page`
- Cadence: 4 hours
- Parser strategy: custom parser
- Risk: medium
- Notes: OpenAI surfaces are high-value but sometimes spread across docs and help center properties

### Anthropic

- Tier: A
- Primary sources:
  - `https://docs.anthropic.com/en/release-notes/api`
  - `https://support.anthropic.com/en/articles/12138966-release-notes`
- Source types: `docs_page`, `changelog_page`
- Cadence: 4 hours
- Parser strategy: custom parser
- Risk: medium

### Google Gemini

- Tier: A
- Primary sources:
  - `https://ai.google.dev/gemini-api/docs/changelog`
- Source types: `docs_page`
- Cadence: 4 hours
- Parser strategy: docs parser
- Risk: medium

### Vercel

- Tier: A
- Primary sources:
  - `https://vercel.com/changelog`
- Source types: `changelog_page`
- Cadence: 4 hours
- Parser strategy: custom parser
- Risk: low

### Stripe

- Tier: A
- Primary sources:
  - `https://docs.stripe.com/changelog`
- Source types: `changelog_page`
- Cadence: 4 hours
- Parser strategy: custom parser
- Risk: low

### GitHub

- Tier: A
- Primary sources:
  - `https://github.blog/changelog/`
- Source types: `blog`
- Cadence: 4 hours
- Parser strategy: custom parser
- Risk: low

### Cloudflare

- Tier: A
- Primary sources:
  - `https://developers.cloudflare.com/changelog/`
- Source types: `changelog_page`
- Cadence: 4 hours
- Parser strategy: custom parser
- Risk: low

### Cursor

- Tier: A
- Primary sources:
  - `https://cursor.com/changelog/`
- Source types: `changelog_page`
- Cadence: 4 hours
- Parser strategy: custom parser
- Risk: low

### Supabase

- Tier: B
- Primary sources:
  - `https://supabase.com/changelog`
- Source types: `changelog_page`
- Cadence: 12 hours
- Parser strategy: generic list parser
- Risk: low

### Firebase

- Tier: B
- Primary sources:
  - `https://firebase.google.com/support/release-notes`
- Source types: `docs_page`
- Cadence: 12 hours
- Parser strategy: docs parser
- Risk: medium
- Notes: Firebase release notes are broad and may require selective extraction

### Apple Developer

- Tier: B
- Primary sources:
  - `https://developer.apple.com/documentation/xcode-release-notes/`
- Source types: `docs_page`
- Cadence: 12 hours plus daily deep diff
- Parser strategy: docs parser
- Risk: high
- Notes: Apple update surfaces can change structure and often benefit from deep diff monitoring

### Android Developers

- Tier: B
- Primary sources:
  - `https://developer.android.com/about/versions/17/release-notes`
- Source types: `docs_page`
- Cadence: 12 hours plus daily deep diff
- Parser strategy: docs parser
- Risk: high

### Firecrawl

- Tier: B
- Primary sources:
  - `https://www.firecrawl.dev/changelog`
- Source types: `changelog_page`
- Cadence: 12 hours
- Parser strategy: generic list parser
- Risk: low

### Exa

- Tier: B
- Primary sources:
  - `https://exa.ai/docs/changelog`
- Source types: `docs_page`
- Cadence: 12 hours
- Parser strategy: docs parser
- Risk: medium

### Clerk

- Tier: B
- Primary sources:
  - `https://clerk.com/changelog`
- Source types: `changelog_page`
- Cadence: 12 hours
- Parser strategy: generic list parser
- Risk: low

### Resend

- Tier: B
- Primary sources:
  - `https://resend.com/changelog`
- Source types: `changelog_page`
- Cadence: 12 hours
- Parser strategy: generic list parser
- Risk: low

### Linear

- Tier: B
- Primary sources:
  - `https://linear.app/changelog`
- Source types: `changelog_page`
- Cadence: 12 hours
- Parser strategy: generic list parser
- Risk: low

### Docker

- Tier: B
- Primary sources:
  - `https://docs.docker.com/desktop/release-notes/`
- Source types: `docs_page`
- Cadence: 12 hours
- Parser strategy: docs parser
- Risk: medium
- Notes: Docker has fragmented release surfaces; v1 tracks Docker Desktop as the canonical public source

## Parser Priority

### First custom parsers

- OpenAI
- Anthropic
- Vercel
- Stripe
- GitHub
- Cloudflare
- Cursor

### Generic list parser candidates

- Supabase
- Firecrawl
- Clerk
- Resend
- Linear

### Docs parser candidates

- Gemini
- Firebase
- Apple Developer
- Android Developers
- Exa
- Docker

## Source Health Expectations

Highest parser risk:

- Apple Developer
- Android Developers
- Firebase

Highest importance if broken:

- OpenAI
- Anthropic
- Vercel
- Stripe
- GitHub
- Cursor
