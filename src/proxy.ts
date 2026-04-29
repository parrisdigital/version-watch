import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { ADMIN_COOKIE_NAME, isValidAdminCookieValue } from "@/lib/admin/session";

const CONTENT_SIGNAL = "ai-train=no, search=yes, ai-input=yes";

function buildHomepageAgentLinks() {
  return [
    '</.well-known/api-catalog>; rel="api-catalog"; type="application/linkset+json"; title="Version Watch API catalog"',
    '</api/v1/openapi.json>; rel="service-desc"; type="application/json"; title="Version Watch OpenAPI"',
    '</agent-access>; rel="service-doc"; type="text/html"; title="Version Watch API documentation"',
    '</api/v1/status>; rel="status"; type="application/json"; title="Version Watch API status"',
    '</llms-full.txt>; rel="describedby"; type="text/markdown"; title="Version Watch full LLM context"',
    '</.well-known/agent-skills/index.json>; rel="describedby"; type="application/json"; title="Version Watch agent skills index"',
  ].join(", ");
}

function withHomepageAgentHeaders(response: NextResponse) {
  response.headers.append("Link", buildHomepageAgentLinks());
  response.headers.set("Content-Signal", CONTENT_SIGNAL);
  return response;
}

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const accept = request.headers.get("accept") ?? "";
  const wantsMarkdown = accept.toLowerCase().includes("text/markdown");

  if (wantsMarkdown && pathname === "/") {
    return NextResponse.rewrite(new URL("/llms-full.txt", request.url));
  }

  if (wantsMarkdown && pathname === "/agent-access") {
    return NextResponse.rewrite(new URL("/llms-full.txt", request.url));
  }

  if (pathname === "/") {
    return withHomepageAgentHeaders(NextResponse.next());
  }

  if (pathname.startsWith("/review/login")) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/admin/login")) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/review") || pathname.startsWith("/ops")) {
    const cookieValue = request.cookies.get(ADMIN_COOKIE_NAME)?.value;
    const isValid = await isValidAdminCookieValue(cookieValue);

    if (!isValid) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = "/review/login";
      loginUrl.searchParams.set("from", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  if (pathname.startsWith("/admin")) {
    const cookieValue = request.cookies.get(ADMIN_COOKIE_NAME)?.value;
    const isValid = await isValidAdminCookieValue(cookieValue);

    if (!isValid) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = "/admin/login";
      loginUrl.searchParams.set("from", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/agent-access", "/review/:path*", "/ops/:path*", "/admin/:path*"],
};
