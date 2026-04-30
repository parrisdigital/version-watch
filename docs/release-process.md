# Release Process

Version Watch separates deployments from releases.

## Deployments

Deployments are operational events:

- Vercel can create production and preview deployment records.
- GitHub Actions can create production deployment records for Convex and health workflows.
- Public GitHub repositories expose Actions history and deployment records.
- Deployment records should not be treated as user-facing release notes.

## Releases

Releases are human-readable project milestones:

- use semantic version tags such as `v0.1.0`
- publish GitHub Releases for public milestones
- update `CHANGELOG.md`
- include verification notes for security, tests, build, and audit checks
- do not tag every production deployment

## Suggested Versioning

- `MAJOR`: breaking public API or major product direction changes
- `MINOR`: new public surfaces, API capabilities, source coverage systems, or significant workflows
- `PATCH`: fixes, docs, dependency patches, and small compatibility improvements

## Release Checklist

Before creating a release:

1. Confirm `main` is clean and pushed.
2. Run `gitleaks git --redact --verbose .`.
3. Run a publishable source-tree Gitleaks scan.
4. Run `npm audit --audit-level=moderate`.
5. Run `npm test`.
6. Run `npm run lint`.
7. Run `npm run build`.
8. Update `CHANGELOG.md`.
9. Create and push the tag.
10. Publish a GitHub Release with verification notes.

