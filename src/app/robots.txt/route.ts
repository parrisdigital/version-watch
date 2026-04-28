import { buildAgentTextHeaders, getPublicBaseUrl } from "@/lib/agent-feed";

export const dynamic = "force-dynamic";

export function GET(request: Request) {
  const baseUrl = getPublicBaseUrl(request.url);
  const content = `User-agent: *
Allow: /
Content-Signal: ai-train=no, search=yes, ai-input=yes

User-agent: ChatGPT-User
Allow: /
Content-Signal: ai-train=no, search=yes, ai-input=yes

User-agent: OAI-SearchBot
Allow: /
Content-Signal: ai-train=no, search=yes, ai-input=yes

User-agent: PerplexityBot
Allow: /
Content-Signal: ai-train=no, search=yes, ai-input=yes

User-agent: Claude-User
Allow: /
Content-Signal: ai-train=no, search=yes, ai-input=yes

User-agent: GPTBot
Disallow: /
Content-Signal: ai-train=no, search=no, ai-input=no

User-agent: ClaudeBot
Disallow: /
Content-Signal: ai-train=no, search=no, ai-input=no

User-agent: anthropic-ai
Disallow: /
Content-Signal: ai-train=no, search=no, ai-input=no

User-agent: Google-Extended
Disallow: /
Content-Signal: ai-train=no, search=no, ai-input=no

User-agent: Applebot-Extended
Disallow: /
Content-Signal: ai-train=no, search=no, ai-input=no

Sitemap: ${new URL("/sitemap.xml", baseUrl).toString()}
Sitemap: ${new URL("/llms.txt", baseUrl).toString()}
`;

  return new Response(content, {
    headers: buildAgentTextHeaders({
      baseUrl,
      content,
      contentType: "text/plain; charset=utf-8",
    }),
  });
}
