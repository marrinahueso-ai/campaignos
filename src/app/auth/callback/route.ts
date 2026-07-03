import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { acceptPendingInvitesForUser } from "@/lib/auth/membership-queries";
import {
  clearPendingFoundingAccessCookieOnResponse,
  pendingFoundingAccessCookieOptions,
  PENDING_FOUNDING_ACCESS_COOKIE,
} from "@/lib/auth/founding-access";
import { resolvePendingFoundingAccessForCallback } from "@/lib/auth/founding-access-callback";
import { resolvePostAuthPathForUser } from "@/lib/auth/post-auth-path";
import { safeNextPath } from "@/lib/auth/safe-next-path";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const invite = searchParams.get("invite");
  const setupIntent = searchParams.get("setup") === "1";
  const requestedNext = safeNextPath(searchParams.get("next"));

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=auth`);
  }

  let nextPath = requestedNext ?? "/dashboard";

  let response = NextResponse.redirect(new URL(nextPath, origin));

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.redirect(new URL(nextPath, origin));
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(`${origin}/login?error=auth`);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let pendingFoundingCode: string | null = null;
  if (user?.email && setupIntent) {
    pendingFoundingCode = resolvePendingFoundingAccessForCallback(
      request,
      user.email,
    );
  }

  // New-school signup must not auto-join an existing invited org.
  if (user?.email && !setupIntent) {
    await acceptPendingInvitesForUser(user.id, user.email);
  }

  if (user) {
    nextPath = await resolvePostAuthPathForUser(
      supabase,
      user.id,
      requestedNext,
      { setupIntent, pendingCode: pendingFoundingCode },
    );
  }

  const target = new URL(nextPath, origin);
  if (invite) {
    target.searchParams.set("joined", "1");
  }

  const finalResponse = NextResponse.redirect(target);
  response.cookies.getAll().forEach(({ name, value, ...options }) => {
    finalResponse.cookies.set(name, value, options);
  });
  if (pendingFoundingCode) {
    finalResponse.cookies.set(
      PENDING_FOUNDING_ACCESS_COOKIE,
      pendingFoundingCode,
      pendingFoundingAccessCookieOptions(),
    );
  } else if (!setupIntent) {
    clearPendingFoundingAccessCookieOnResponse(finalResponse);
  }
  return finalResponse;
}
