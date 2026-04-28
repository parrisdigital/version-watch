import { buildAgentTextHeaders, getPublicBaseUrl } from "@/lib/agent-feed";
import { getAllPublicEvents, getVendors } from "@/lib/site-data";

export const dynamic = "force-dynamic";

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function urlEntry(location: string, lastModified?: string) {
  const lastmod = lastModified ? `\n    <lastmod>${escapeXml(lastModified)}</lastmod>` : "";
  return `  <url>\n    <loc>${escapeXml(location)}</loc>${lastmod}\n  </url>`;
}

export async function GET(request: Request) {
  const baseUrl = getPublicBaseUrl(request.url);
  let vendors: Awaited<ReturnType<typeof getVendors>> = [];
  let events: Awaited<ReturnType<typeof getAllPublicEvents>> = [];

  try {
    [vendors, events] = await Promise.all([getVendors(), getAllPublicEvents()]);
  } catch (error) {
    console.warn("Could not load dynamic sitemap records.", error);
  }

  const staticPaths = [
    "/",
    "/about",
    "/agent-access",
    "/vendors",
    "/search",
    "/feedback",
    "/llms.txt",
    "/llms-full.txt",
    "/agents.md",
    "/skills/version-watch/SKILL.md",
    "/feed.md",
    "/api/v1/openapi.json",
    "/.well-known/agent-skills",
    "/llms-status",
    "/llms-readiness",
  ];
  const vendorPaths = vendors.map((vendor) => `/vendors/${vendor.slug}`);
  const eventPaths = events.map((event) => ({
    path: `/events/${event.slug}`,
    lastModified: event.publishedAt,
  }));
  const entries = [
    ...staticPaths.map((path) => urlEntry(new URL(path, baseUrl).toString())),
    ...vendorPaths.map((path) => urlEntry(new URL(path, baseUrl).toString())),
    ...eventPaths.map(({ path, lastModified }) => urlEntry(new URL(path, baseUrl).toString(), lastModified)),
  ];
  const content = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.join("\n")}\n</urlset>\n`;

  return new Response(content, {
    headers: buildAgentTextHeaders({
      baseUrl,
      content,
      contentType: "application/xml; charset=utf-8",
    }),
  });
}
