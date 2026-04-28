import { buildAgentTextHeaders, getPublicBaseUrl, renderLlmsFullTxt } from "@/lib/agent-feed";

export const dynamic = "force-dynamic";

export function GET(request: Request) {
  const baseUrl = getPublicBaseUrl(request.url);
  const content = renderLlmsFullTxt(baseUrl);

  return new Response(content, {
    headers: buildAgentTextHeaders({
      baseUrl,
      content,
      contentType: "text/markdown; charset=utf-8",
    }),
  });
}
