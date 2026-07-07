import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { DEFAULT_SITE_URL, shouldRedirectToPrimaryDomain } from "@/lib/site/url";

export async function middleware(request: NextRequest) {
  const host = request.headers.get("host");
  if (shouldRedirectToPrimaryDomain(host)) {
    const destination = new URL(
      `${request.nextUrl.pathname}${request.nextUrl.search}`,
      DEFAULT_SITE_URL,
    );
    return NextResponse.redirect(destination, 301);
  }

  return updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
