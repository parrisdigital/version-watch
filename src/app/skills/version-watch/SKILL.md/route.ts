import { getPublicBaseUrl, PUBLIC_AGENT_HEADERS, renderVersionWatchSkillMarkdown } from "@/lib/agent-feed";

export const dynamic = "force-dynamic";

export function OPTIONS() {
  return new Response(null, { headers: PUBLIC_AGENT_HEADERS });
}

export function GET(request: Request) {
  return new Response(renderVersionWatchSkillMarkdown(getPublicBaseUrl(request.url)), {
    headers: {
      ...PUBLIC_AGENT_HEADERS,
      "Content-Type": "text/markdown; charset=utf-8",
    },
  });
}
