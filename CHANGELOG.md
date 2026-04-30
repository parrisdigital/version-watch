# Changelog

All notable public releases of Version Watch are documented here.

Version Watch uses GitHub Releases and semantic version tags for human-readable project milestones. Routine production deployments may happen more often than releases.

## Unreleased

### Fixed

- Correct shadcnspace changelog parsing so versions and exact release dates match the upstream timeline.
- Move shadcn ecosystem vendors into a clearer Design Systems & UI directory category.
- Make forced admin refreshes reparse unchanged source content, and allow source-link repair rules to target exact URL fragments.
- Update the Warp changelog source URL after the previous markdown endpoint began returning 404s.
- Reactivate paused sources when they remain present in the active registry after a source repair.

## [0.1.1] - 2026-04-30

### Added

- Added shadcnspace to the vendor directory with its official changelog source and self-hosted logo.
- Added shadcnspace changelog parsing so public updates are normalized from the upstream timeline.

### Fixed

- Improved guarded changelog ingestion by retrying bot-blocked `404` responses with a browser user-agent fallback.
- Restored clean production source health after the Firecrawl changelog began returning bot-specific not-found responses.

## [0.1.0] - 2026-04-30

### Added

- Initial open source release.
- Public developer-platform change intelligence app.
- Searchable update explorer, vendor directory, canonical event pages, and feedback flow.
- Public JSON, Markdown, OpenAPI, status, taxonomy, vendor, update, and cluster API routes.
- Agent-facing resources including `agents.md`, `llms.txt`, `llms-full.txt`, and the Version Watch skill route.
- Convex-backed ingestion, review, source health, freshness, and watchlist operations.
- MIT license, security policy, contributing guide, support guide, code of conduct, issue templates, PR template, and open source checklist.

### Security

- Verified git history and publishable source tree with Gitleaks before public release.
- Enabled GitHub secret scanning, push protection, Dependabot alerts, and Dependabot security updates.
- Patched the PostCSS advisory with an npm override to `postcss@8.5.12`.

[0.1.1]: https://github.com/parrisdigital/version-watch/releases/tag/v0.1.1
[0.1.0]: https://github.com/parrisdigital/version-watch/releases/tag/v0.1.0
