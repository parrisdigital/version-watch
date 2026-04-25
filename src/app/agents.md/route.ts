import { getPublicBaseUrl, renderAgentsMarkdown } from "@/lib/agent-feed";

export const dynamic = "force-dynamic";

export function GET(request: Request) {
  const baseUrl = getPublicBaseUrl(request.url);

  return new Response(renderAgentsMarkdown(baseUrl), {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=300, s-maxage=600",
      "Content-Type": "text/markdown; charset=utf-8",
    },
  });
}
