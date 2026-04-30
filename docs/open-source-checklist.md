# Open Source Checklist

Use this checklist before changing `parrisdigital/version-watch` from private to public.

## Prep Findings

This public-release prep pass found:

- the active `main` checkout was clean before these prep edits
- only `.env.example` is tracked as an environment file
- `.env`, `.env.local`, `.env.*`, `.pem`, and `.key` files are ignored after this update
- Gitleaks scanned 95 git commits with no leaks found
- Gitleaks scanned the publishable source tree with no leaks found
- the repository now includes an MIT `LICENSE`
- required GitHub Environment secrets are present for production deploy workflows
- Dependabot vulnerability alerts were enabled

Repeat these scans before major public launches or any time a credential may have been committed.

## 1. Scan Current Files And Git History

Install a dedicated scanner and scan with redaction enabled.

```bash
brew install gitleaks
gitleaks git --redact --verbose .
gitleaks dir --redact --verbose .
```

Also check tracked environment files and their history:

```bash
git ls-files | rg '(^|/)\\.env|secret|key|token|credential|private'
git log --all --name-status -- .env .env.local .env.production .env.development .env.example
```

If anything real appears, rotate the credential even if the file was deleted later.

## 2. Rotate Sensitive Credentials If Needed

Rotate any credential that ever appeared in git history or issue comments:

- Convex deploy keys and admin keys
- `ADMIN_SECRET`
- Vercel tokens
- GitHub personal access tokens
- Slack, Discord, or other webhook URLs
- any provider API key used for ingestion or monitoring

Deleting a committed secret does not make it private again.

## 3. Confirm Runtime Secret Storage

Production secrets should live outside git:

- Vercel project environment variables for the web app
- Convex environment variables for Convex functions
- GitHub Environments named `development` and `production`
- GitHub Environment secrets for `CONVEX_DEPLOY_KEY` and `ADMIN_SECRET`

Do not store production secrets in `.env.example`, README examples, docs, screenshots, issues, or workflow logs.

## 4. Confirm The License

Version Watch uses the MIT License. Keep the `LICENSE` file at the repository root so GitHub can detect it.

Without a license, the code would be visible but not actually open source for reuse.

## 5. Enable GitHub Security Features

After the repo is public:

- enable secret scanning alerts
- keep push protection enabled
- enable Dependabot alerts
- optionally add Dependabot version updates
- enable private vulnerability reporting or GitHub Security Advisories

## 6. Review Public Project Metadata

Before flipping visibility:

- update the repository description and topics
- confirm the default branch is `main`
- confirm branch protection or rulesets for `main`
- confirm Actions permissions are limited to what workflows need
- decide whether Issues and Discussions should be enabled on day one
- pin `README.md`, `CONTRIBUTING.md`, `SECURITY.md`, and `LICENSE`

## 7. Change Visibility

Only after the checks above are complete, change visibility in GitHub:

- GitHub UI: repository `Settings` -> `General` -> `Danger Zone` -> `Change repository visibility`
- GitHub CLI: `gh repo edit parrisdigital/version-watch --visibility public`

Do not run the CLI command until the final secret scan and license choice are complete.
