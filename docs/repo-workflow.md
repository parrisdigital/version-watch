# Repo Workflow

## Source Control Model

Version Watch uses a GitHub-first workflow.

## Branch Strategy

- `main` for production-ready code
- short-lived feature branches for work in progress

Branch naming:

- `feat/<area>`
- `fix/<area>`
- `docs/<area>`

Examples:

- `feat/convex-ingestion`
- `feat/homepage-feed`
- `docs/spec-package`

## Pull Request Strategy

Every substantive change should go through a PR, even for a solo project, because:

- Vercel preview deployments are tied to PRs
- the review surface is cleaner
- history stays easier to audit

## Expected PR Shape

- one primary change area per PR
- screenshots for visible UI changes
- short note on Convex schema/function changes when relevant
- verification steps included in the PR description

## Deployment Linkage

- GitHub PR opens Vercel preview deployment
- merged `main` branch deploys production web app
- Convex deployment changes should be kept aligned with the merged code
- deployment records are operational; public release history should use GitHub Releases and semantic version tags

## Platform Expectations

Use GitHub for PR creation, review, repo metadata, and deployment-adjacent repository operations.

Use Vercel for preview deployment inspection and production deployment follow-up.

## Commit Conventions

Suggested format:

- `docs: add product and architecture package`
- `feat: add vendor registry and source ingestion`
- `feat: build review queue`
- `fix: correct ranking weights for low-signal docs updates`

## Initial Repo Setup Expectations

When implementation starts:

1. initialize git if not already initialized
2. create GitHub repository
3. connect Vercel project to the repository
4. connect Convex deployment to the repo-based workflow

## Protected Behaviors

- do not deploy directly from arbitrary local branches
- do not bypass PR previews for meaningful UI work
- do not make schema-affecting changes without updating the docs when the model changes materially
