# Classification And Ranking

## Purpose

Version Watch needs deterministic rules for:

- category tagging
- role relevance
- affected stack tagging
- homepage ranking
- release intelligence

Signal v2 uses rule-based classification, not LLM inference. Severity answers "how urgent is this?" while `release_class` answers "what kind of change is this?"

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

Use a 0-100 score. Signal v2 starts from `release_class`, then applies small adjustments for source quality, freshness, confidence, and evidence. This keeps routine patch releases from outranking major model launches or breaking platform changes just because they came from a high-quality official source.

### Release Classes

- `breaking`: behavior removal, deprecation, migration, default behavior, or compatibility change.
- `security`: vulnerability, credential, secret, auth, or security patch.
- `model_launch`: new model, frontier model, model availability, or model behavior launch.
- `pricing`: pricing, cost, credit, invoice, usage pricing, or plan-limit change.
- `policy`: policy, governance, compliance, review, or terms change.
- `api_change`: endpoint, parameter, schema, request, response, webhook, or contract change.
- `sdk_release`: SDK, client library, package, or library release.
- `cli_patch`: semantic-version CLI patch release.
- `beta_release`: beta, alpha, release candidate, preview, canary, or nightly release.
- `docs_update`: docs-only update with no clear shipping impact.
- `routine_release`: official update with no stronger operational evidence.

### Base Scores

- `security`: 86
- `breaking`: 82
- `pricing`: 72
- `policy`: 68
- `model_launch`: 66
- `api_change`: 52
- `sdk_release`: 42
- `cli_patch`: 30
- `beta_release`: 28
- `routine_release`: 24
- `docs_update`: 18

### Adjustments

- source type: official changelog and GitHub releases get a small evidence boost
- freshness: recent updates receive a small boost
- GitHub evidence: official GitHub link adds a small boost
- impact confidence: `high`, `medium`, or `low` adjusts the final score

### Score Caps

Low-operational-impact classes are capped:

- `cli_patch`: max 42
- `beta_release`: max 40
- `routine_release`: max 36
- `docs_update`: max 28

This means a Codex CLI patch can remain visible and useful, but it should not carry the same urgency as a GPT frontier-model launch, breaking API change, deprecation, security patch, or pricing change.

### Repeat Decay

Same vendor, same source, same release family updates inside a 24-hour window receive repeat decay when the class is `cli_patch`, `beta_release`, `routine_release`, or `sdk_release`.

The first release keeps its normal score. Later related releases receive a `signal_reasons` entry such as `repeat_decay:-10`. Homepage presentation may also cluster the related updates into one digest card.

## Importance Bands

- `critical`: 80-100
- `high`: 50-79
- `medium`: 30-49
- `low`: 0-29

## Signal Reasons

Each public update exposes machine-readable `signal_reasons`, for example:

- `release_class:model_launch`
- `impact_confidence:high`
- `source:docs_page`
- `repeat_decay:-10`

Agents should use `release_class`, `impact_confidence`, `signal_reasons`, and `recommended_action` together instead of relying only on `signal_score`.

## Topic Tags

Broad `categories` remain stable for compatibility. Signal v2 adds deterministic topic tags where evidence is clear:

- `frontier-model`
- `cli-release`
- `patch-release`
- `beta-release`
- `deprecation`
- `sdk-update`
- `api-contract`
- `pricing-change`

## Homepage Ranking Rules

Default homepage sort:

1. importance band
2. raw importance score
3. published date descending

Tie-breaker:

- prefer events with official source and GitHub evidence over source-only docs tweaks
- cluster repeated same-vendor release-family noise before rendering the latest feed

## Vendor Page Sorting

Vendor pages ignore importance by default and sort by:

1. published date descending
2. discovered date descending

## Publish Thresholds

All items still require review, but thresholds guide attention:

- `critical` and `high`: review first
- `medium`: review normally
- `low`: likely suppress unless still useful for vendor completeness

## Public API Contract

Public update objects expose these signal v2 fields:

- `release_class`
- `impact_confidence`
- `signal_reasons`
- `score_version`

Raw updates remain available through `/api/v1/updates`. Clustered digest output is additive through `/api/v1/clusters` and homepage latest presentation.
