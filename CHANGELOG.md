# Changelog

All notable public releases of Version Watch are documented here.

Version Watch uses GitHub Releases and semantic version tags for human-readable project milestones. Routine production deployments may happen more often than releases.

## Unreleased

### Changed

- Rename the former Windsurf vendor entry to Devin Desktop, switch its tracked source to the official Devin Desktop changelog, and add the official Devin logo asset.
- Force-refresh vendor slugs touched by a production deploy before production coverage runs, preventing fresh-source skips after parser or source changes.

### Fixed

- Treat legacy DP Code/Synara GitHub release links as accepted historical source details in source-link audits.
- Report intentionally unsupported zero-update vendors as vendor coverage notes instead of warnings.

## [0.1.3] - 2026-06-06

### Added

- Add shadcn Studio and shadcnblocks to the vendor directory with official changelog sources and self-hosted logo assets.
- Add parser coverage for shadcnblocks changelog cards and shadcn Studio `CHANGELOG.md` entries.

### Changed

- Rename the former DP Code directory entry to Synara while preserving the `dp-code` slug for existing public URLs.
- Update the Synara source to the official Synara changelog and replace the stale DP Code favicon with a self-hosted Synara logo.

### Fixed

- Parse shadcnblocks' Astro-rendered changelog data so production publishes its updates during forced or scheduled refreshes.
- Bound the public cluster API to a recent event window so `/api/v1/clusters` stays within production response limits.

## [0.1.2] - 2026-06-06

### Changed

- Consolidate dependency maintenance by grouping future Dependabot npm and GitHub Actions updates.
- Update maintenance dependencies and GitHub Actions versions used by project workflows.
- Keep automated Dependabot version PRs scoped to minor and patch updates; major upgrades remain manual maintenance.
- Update Next.js, Convex, Vitest, React, Radix, Playwright, and related maintenance dependencies.

### Fixed

- Restore production health by moving Clerk ingestion to Clerk's Markdown changelog surface.
- Bound production freshness and vendor freshness Convex queries so growing ingestion and refresh request tables do not break public status pages.
- Add production health regression coverage for high-growth Convex query reads.
- Hold future-dated upstream changelog entries out of the public feed until they are within the public freshness skew window.
- Correct shadcnspace changelog parsing so versions and exact release dates match the upstream timeline.
- Move shadcn ecosystem vendors into a clearer Design Systems & UI directory category.
- Make forced admin refreshes reparse unchanged source content, and allow source-link repair rules to target exact URL fragments.
- Update the Warp changelog source URL after the previous markdown endpoint began returning 404s.
- Reactivate paused sources when they remain present in the active registry after a source repair.

### Security

- Clear npm audit findings for Next.js, Vitest, Convex/ws, and brace-expansion.

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

[0.1.3]: https://github.com/parrisdigital/version-watch/releases/tag/v0.1.3
[0.1.2]: https://github.com/parrisdigital/version-watch/releases/tag/v0.1.2
[0.1.1]: https://github.com/parrisdigital/version-watch/releases/tag/v0.1.1
[0.1.0]: https://github.com/parrisdigital/version-watch/releases/tag/v0.1.0
