import Link from "next/link";

const AGENT_LINKS = [
  { href: "/agent-access", label: "API docs" },
  { href: "/agents.md", label: "agents.md" },
  { href: "/llms.txt", label: "llms.txt" },
  { href: "/feed.md", label: "feed.md" },
  { href: "/skills/version-watch/SKILL.md", label: "SKILL.md" },
  { href: "/api/v1/openapi.json", label: "OpenAPI" },
] as const;

const SAMPLE_REQUEST = "GET https://versionwatch.dev/api/v1/updates?severity=high";

/**
 * Mono-flavored band promoting the locked agent surface. Single instance per page.
 * Visual is intentionally restrained: kicker, headline, sample request line,
 * link row. No card grid, no decoration.
 */
export function AgentSurfaceSection() {
  return (
    <section
      aria-label="For agents"
      id="for-agents"
      className="border-t border-[var(--border)]"
    >
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
        <div className="grid gap-10 lg:grid-cols-[5fr_7fr] lg:items-center lg:gap-16">
          <div className="flex flex-col gap-3">
            <p className="font-mono text-xs uppercase tracking-wider text-[var(--muted-foreground)]">
              For agents
            </p>
            <h2 className="max-w-[24ch] text-balance text-2xl font-semibold tracking-tight text-[var(--foreground)] sm:text-3xl lg:text-4xl">
              Read by agents. Shipped with an OpenAPI contract.
            </h2>
            <p className="max-w-[52ch] text-pretty text-sm leading-relaxed text-[var(--muted-foreground)] sm:text-base">
              Same feed humans see, published as a structured API. Drop llms.txt or our SKILL.md into your AI tool, or hit the JSON directly.
            </p>
          </div>

          <div className="flex flex-col gap-5">
            <pre className="overflow-x-auto rounded-lg border border-[var(--border)] bg-[var(--card)] p-5 font-mono text-[0.8125rem] leading-relaxed text-[var(--foreground)]">
              <code>{SAMPLE_REQUEST}</code>
            </pre>
            <ul role="list" className="flex flex-wrap items-center gap-x-5 gap-y-2">
              {AGENT_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="font-mono text-xs text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)]"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
