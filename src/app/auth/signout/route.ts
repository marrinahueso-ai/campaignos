import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { SIMULATED_ROLE_COOKIE } from "@/lib/auth/get-current-role";

/** Sign-out must be POST-only — GET prefetch previously logged users out accidentally. */
export async function POST(request: NextRequest) {
  let response = NextResponse.redirect(new URL("/login", request.url));

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
          response = NextResponse.redirect(new URL("/login", request.url));
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  await supabase.auth.signOut();
  response.cookies.set(SIMULATED_ROLE_COOKIE, "", {
    path: "/",
    sameSite: "lax",
    maxAge: 0,
  });
  return response;
}

export async function GET() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}
