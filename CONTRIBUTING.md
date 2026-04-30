# Contributing

Thanks for helping improve Version Watch. This project tracks official developer-platform changes, so contributions should preserve source provenance and keep public records easy to verify.

## Local Development

```bash
npm ci
cp .env.example .env.local
npm run dev
```

The app can render public pages with fallback data when `NEXT_PUBLIC_CONVEX_URL` is not set. Production and admin workflows require Convex plus the private environment variables described in `README.md`.

## Before Opening A Pull Request

Run the checks that match the change:

```bash
npm run lint
npm test
```

Run Playwright when changing public page flows:

```bash
npm run test:e2e
```

Run production health scripts only when you have access to the production environment:

```bash
npm run health:production
npm run signal:production
npm run sources:production
npm run vendors:production
```

## Contribution Areas

- vendor source definitions
- ingestion parsing and deduplication
- signal classification and ranking
- public API and feed reliability
- docs and examples for developers and agents
- tests for filters, scoring, source quality, and public routes

## Source Rules

- Prefer official release notes, changelogs, docs, RSS feeds, blogs, and GitHub releases.
- Keep official source URLs attached to every public update.
- Do not publish claims that cannot be traced back to a source.
- Preserve neutral wording. Version Watch is a utility, not a vendor ranking or review site.

## Secret Rules

- Never commit `.env`, `.env.local`, deploy keys, API tokens, admin secrets, webhook URLs, or private Convex credentials.
- Use local `.env.local` files, Vercel environment variables, Convex environment variables, and GitHub Environment secrets.
- If a secret is committed, rotate it before doing anything else. Removing it from the latest commit is not enough because git history still contains it.
