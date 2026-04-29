import Link from "next/link";

const REPO_URL = "https://github.com/parrisdigital/version-watch";

function GithubMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      aria-hidden="true"
      className={className}
      fill="currentColor"
    >
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
    </svg>
  );
}

const PROJECT_LINKS = [
  { href: "/about", label: "About" },
  { href: "/feedback", label: "Feedback" },
  { href: REPO_URL, label: "GitHub", external: true },
] as const;

const AGENT_LINKS = [
  { href: "/agent-access", label: "API docs" },
  { href: "/agents.md", label: "agents.md" },
  { href: "/llms.txt", label: "llms.txt" },
  { href: "/feed.md", label: "Markdown feed" },
  { href: "/skills/version-watch/SKILL.md", label: "SKILL.md" },
  { href: "/api/v1/openapi.json", label: "OpenAPI" },
] as const;

const COPYRIGHT_YEAR = 2026;

type FooterLink = {
  href: string;
  label: string;
  external?: boolean;
};

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-[var(--border)]">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-10 sm:grid-cols-[1.2fr_0.9fr_1.3fr] sm:gap-12">
          <div>
            <p className="font-[var(--font-display)] text-base font-semibold text-[var(--foreground)]">
              Version Watch
            </p>
            <p className="mt-2 max-w-[28ch] text-sm leading-relaxed text-[var(--muted-foreground)]">
              Change intelligence for developers. Open source. Read by humans, agents, and CI.
            </p>
          </div>

          <FooterColumn label="Project" links={PROJECT_LINKS} />
          <FooterColumn label="For agents" links={AGENT_LINKS} />
        </div>

        <div className="mt-12 flex flex-wrap items-center justify-between gap-4 border-t border-[var(--border)] pt-6">
          <p className="font-[var(--font-mono)] text-[0.6875rem] uppercase tracking-wider text-[var(--muted-foreground)]">
            © {COPYRIGHT_YEAR} Version Watch · Open source · Built by Parris Digital
          </p>
          <a
            href={REPO_URL}
            target="_blank"
            rel="noreferrer"
            aria-label="Version Watch on GitHub"
            className="inline-flex items-center justify-center rounded-md p-2 text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)]"
          >
            <GithubMark className="size-4" />
          </a>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({ label, links }: { label: string; links: ReadonlyArray<FooterLink> }) {
  return (
    <nav aria-label={label}>
      <p className="font-[var(--font-mono)] text-[0.6875rem] uppercase tracking-wider text-[var(--muted-foreground)]">
        {label}
      </p>
      <ul role="list" className="mt-4 grid gap-2.5">
        {links.map((link) => (
          <li key={link.href}>
            {link.external ? (
              <a
                href={link.href}
                target="_blank"
                rel="noreferrer"
                className="text-sm text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)]"
              >
                {link.label}
              </a>
            ) : (
              <Link
                href={link.href}
                className="text-sm text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)]"
              >
                {link.label}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </nav>
  );
}
