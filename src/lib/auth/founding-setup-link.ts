/**
 * Build a founding setup URL that works with our PKCE/SSR auth callback.
 *
 * `admin.generateLink` returns an implicit-flow `action_link`. If we email that
 * URL, Supabase verifies the user but redirects with hash tokens the server
 * callback never sees — users land on "Sign-in link expired or invalid".
 *
 * Instead, email our `/auth/callback` with `token_hash` + `type` and verify via
 * `verifyOtp` on the server.
 */

export function buildFoundingSetupEmailUrl(input: {
  /** Full public callback URL including setup/next/fac query params. */
  emailRedirectTo: string;
  actionLink: string;
  hashedToken?: string | null;
  verificationType?: string | null;
}): string | null {
  let tokenHash = input.hashedToken?.trim() || "";
  let otpType = input.verificationType?.trim() || "";

  try {
    const action = new URL(input.actionLink);
    if (!tokenHash) {
      tokenHash = action.searchParams.get("token")?.trim() || "";
    }
    if (!otpType) {
      otpType = action.searchParams.get("type")?.trim() || "";
    }
  } catch {
    return null;
  }

  if (!tokenHash || !otpType) {
    return null;
  }

  try {
    const callback = new URL(input.emailRedirectTo);
    callback.searchParams.set("token_hash", tokenHash);
    callback.searchParams.set("type", otpType);
    return callback.toString();
  } catch {
    return null;
  }
}
