import Link from "next/link";

import { GithubMark } from "@/components/icons/github-mark";

const REPO_URL = "https://github.com/parrisdigital/version-watch";

const PROJECT_LINKS = [
  { href: "/about", label: "About" },
  { href: "/feedback", label: "Feedback" },
  { href: REPO_URL, label: "GitHub", external: true },
] as const;

const OPS_LINKS = [
  { href: "/ops/health", label: "Source health" },
  { href: "/ops/source-links", label: "Source links" },
  { href: "/ops/signal", label: "Signal quality" },
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
        <div className="grid gap-10 sm:grid-cols-[1.2fr_0.9fr_0.9fr_1.3fr] sm:gap-10">
          <div>
            <p className="font-[var(--font-display)] text-base font-semibold text-[var(--foreground)]">
              Version Watch
            </p>
            <p className="mt-2 max-w-[28ch] text-sm leading-relaxed text-[var(--muted-foreground)]">
              Change intelligence for developers. Open source. Read by humans, agents, and CI.
            </p>
          </div>

          <FooterColumn label="Project" links={PROJECT_LINKS} />
          <FooterColumn label="Operations" links={OPS_LINKS} />
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
