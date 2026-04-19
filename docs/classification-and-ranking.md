# Classification And Ranking

## Purpose

Version Watch needs deterministic rules for:

- category tagging
- role relevance
- affected stack tagging
- homepage ranking

V1 uses rule-based classification, not LLM inference.

## Category Taxonomy

Every candidate can have one or more categories:

- `breaking`
- `deprecation`
- `api`
- `model`
- `sdk`
- `pricing`
- `policy`
- `security`
- `infra`
- `docs`

## Who-Should-Care Taxonomy

Use one or more role tags:

- `frontend`
- `backend`
- `mobile`
- `infra`
- `ai`
- `data`
- `security`
- `product`

## Affected Stack Taxonomy

Use one or more stack tags:

- `hosting`
- `deployments`
- `payments`
- `auth`
- `llms`
- `agents`
- `search`
- `email`
- `mobile-platform`
- `database`
- `observability`
- `developer-workflow`

## Deterministic Tagging Rules

### Category heuristics

- mention of removed support, discontinued support, migration deadline: `breaking` or `deprecation`
- mention of API endpoint or parameter changes: `api`
- mention of model names, pricing, context windows, tool behavior: `model`
- mention of SDK release or client library support: `sdk`
- mention of plan pricing, seats, usage pricing: `pricing`
- mention of app store, policy, review, compliance, org policy: `policy`
- mention of CVE, patch, vulnerability, token leak, auth exposure: `security`
- mention of deploy, runtime, cache, worker, compute, infra services: `infra`
- docs-only structural changes with no shipping impact: `docs`

### Role heuristics

- UI libraries, frameworks, browsers, web tooling: `frontend`
- APIs, infra, databases, queues, deployments: `backend` or `infra`
- iOS, Android, Xcode, SDK policy: `mobile`
- models, prompts, agents, MCP, inference APIs: `ai`
- warehouse, analytics, database changes: `data`
- auth, CVEs, policies, secrets: `security`
- roadmap/product process tooling: `product`

### Stack heuristics

Map vendor and category combinations into the stack taxonomy. Example:

- Stripe + pricing/api -> `payments`
- Clerk + auth -> `auth`
- OpenAI/Anthropic/Gemini/Cursor/Codex -> `llms` or `agents`
- Cloudflare/Vercel/Docker -> `hosting` or `deployments`
- Firebase/Supabase -> `database`
- Resend -> `email`
- GitHub/Linear/Cursor -> `developer-workflow`

## Scoring Model

Use a 0-100 score.

### Source type weight

- `github_release`: +20
- `changelog_page`: +20
- `blog`: +12
- `docs_page`: +8
- `rss`: +10

### Category weight

- `breaking`: +40
- `deprecation`: +35
- `security`: +35
- `pricing`: +25
- `policy`: +25
- `model`: +20
- `api`: +18
- `sdk`: +18
- `infra`: +15
- `docs`: +5

### Vendor tier weight

- Tier A: +10
- Tier B: +5

### Freshness weight

- within 24 hours: +15
- within 72 hours: +10
- within 7 days: +5
- older than 7 days: +0

### Evidence weight

- GitHub link present: +5
- multiple official source links: +5

## Importance Bands

- `critical`: 70-100
- `high`: 50-69
- `medium`: 30-49
- `low`: 0-29

## Homepage Ranking Rules

Default homepage sort:

1. importance band
2. raw importance score
3. published date descending

Tie-breaker:

- prefer events with official source and GitHub evidence over source-only docs tweaks

## Vendor Page Sorting

Vendor pages ignore importance by default and sort by:

1. published date descending
2. discovered date descending

## Publish Thresholds

All items still require review, but thresholds guide attention:

- `critical` and `high`: review first
- `medium`: review normally
- `low`: likely suppress unless still useful for vendor completeness
