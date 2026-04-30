# Security Policy

## Reporting Vulnerabilities

Please report security issues privately through GitHub Security Advisories once the repository is public. Do not open a public issue for vulnerabilities, leaked credentials, auth bypasses, or production deployment details.

## Secrets

Version Watch uses server-side secrets for admin review workflows, operational APIs, Convex deployment, and production automation. These values must never be committed:

- `ADMIN_SECRET`
- `CONVEX_DEPLOY_KEY`
- production `.env` files
- Vercel tokens
- Convex deploy keys or admin keys
- webhook URLs
- personal access tokens

If a secret is exposed, rotate it at the provider first. Then remove it from the repository and investigate whether it exists in git history.

## Supported Versions

The public site and the `main` branch receive security fixes. Older branches are not supported.
