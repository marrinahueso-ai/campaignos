import type { CookieOptionsWithName } from "@supabase/ssr";

/**
 * Shared Supabase auth cookie options for every client (browser, server,
 * middleware). Without explicit options these default to `secure: false`
 * and no `maxAge` (some browsers then treat them as ~400-day cookies).
 *
 * `httpOnly` is intentionally left unset (false): `createBrowserClient()`
 * reads these cookies directly via `document.cookie`, so making them
 * httpOnly would break client-side auth state.
 */
const SESSION_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days, refreshed on active use

export function getSupabaseCookieOptions(): CookieOptionsWithName {
  return {
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_COOKIE_MAX_AGE_SECONDS,
  };
}
