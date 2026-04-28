import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { ADMIN_COOKIE_NAME, isValidAdminCookieValue } from "@/lib/admin/session";

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

  if (pathname.startsWith("/review/login")) {
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

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/agent-access", "/review/:path*", "/ops/:path*"],
};
