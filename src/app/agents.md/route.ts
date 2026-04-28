import { buildAgentTextHeaders, getPublicBaseUrl, renderAgentsMarkdown } from "@/lib/agent-feed";

export const dynamic = "force-dynamic";

export function GET(request: Request) {
  const baseUrl = getPublicBaseUrl(request.url);
  const content = renderAgentsMarkdown(baseUrl);

  return new Response(content, {
    headers: buildAgentTextHeaders({
      baseUrl,
      content,
      contentType: "text/markdown; charset=utf-8",
    }),
  });
}
