import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { acceptPendingInvitesForUser } from "@/lib/auth/membership-queries";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const invite = searchParams.get("invite");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user?.email) {
        await acceptPendingInvitesForUser(user.id, user.email);
      }

      const redirectUrl = new URL(next, origin);
      if (invite) {
        redirectUrl.searchParams.set("joined", "1");
      }
      return NextResponse.redirect(redirectUrl);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
