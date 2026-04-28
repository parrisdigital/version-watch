import {
  buildAgentTextHeaders,
  getPublicBaseUrl,
  PUBLIC_AGENT_HEADERS,
  renderVersionWatchSkillMarkdown,
} from "@/lib/agent-feed";

export const dynamic = "force-dynamic";

export function OPTIONS() {
  return new Response(null, { headers: PUBLIC_AGENT_HEADERS });
}

export function GET(request: Request) {
  const baseUrl = getPublicBaseUrl(request.url);
  const content = renderVersionWatchSkillMarkdown(baseUrl);

  return new Response(content, {
    headers: buildAgentTextHeaders({
      baseUrl,
      content,
      contentType: "text/markdown; charset=utf-8",
      cacheControl: PUBLIC_AGENT_HEADERS["Cache-Control"],
    }),
  });
}
