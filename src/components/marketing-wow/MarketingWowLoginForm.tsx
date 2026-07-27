"use client";

import { useActionState, useState, useTransition } from "react";
import Link from "next/link";
import {
  getOAuthSignInUrl,
  signInWithPasswordAction,
  type AuthActionState,
} from "@/lib/auth/actions";
import { MarketingWowLegalLinks } from "@/components/marketing-wow/MarketingWowAuthShell";

const initialState: AuthActionState = {
  error: null,
  success: false,
  message: null,
};

interface MarketingWowLoginFormProps {
  inviteToken?: string | null;
  defaultEmail?: string;
  nextPath?: string | null;
  authErrorMessage?: string | null;
}

export function MarketingWowLoginForm({
  inviteToken = null,
  defaultEmail = "",
  nextPath = null,
  authErrorMessage = null,
}: MarketingWowLoginFormProps) {
  const [state, action, pending] = useActionState(
    signInWithPasswordAction,
    initialState,
  );
  const [oauthError, setOauthError] = useState<string | null>(null);
  const [oauthPending, startOauth] = useTransition();

  function continueWithGoogle() {
    startOauth(async () => {
      setOauthError(null);
      const result = await getOAuthSignInUrl("google", inviteToken, nextPath);
      if ("error" in result) {
        setOauthError(result.error);
        return;
      }
      window.location.assign(result.url);
    });
  }

  return (
    <>
      <h1>Log in</h1>
      <p className="sub">
        Returning to your workspace? Sign in with email or Google.
      </p>

      {authErrorMessage ? (
        <p className="mw-msg-error">{authErrorMessage}</p>
      ) : null}

      <button
        type="button"
        className="social-btn"
        style={{ marginTop: 22 }}
        disabled={oauthPending || pending}
        onClick={continueWithGoogle}
      >
        <GoogleMark />
        {oauthPending ? "Connecting…" : "Continue with Google"}
      </button>

      <div className="auth-divider">or</div>

      <form action={action}>
        {inviteToken ? (
          <input type="hidden" name="inviteToken" value={inviteToken} />
        ) : null}
        {nextPath ? <input type="hidden" name="next" value={nextPath} /> : null}

        <div className="field">
          <label htmlFor="login-email">Email</label>
          <input
            id="login-email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@yourorg.com"
            defaultValue={defaultEmail}
            required
          />
        </div>
        <div className="field">
          <label htmlFor="login-password">Password</label>
          <input
            id="login-password"
            name="password"
            type="password"
            autoComplete="current-password"
            placeholder="Password"
            required
          />
        </div>
        <div className="auth-row">
          <span />
          <Link href="/forgot-password" className="btn-text">
            Forgot password?
          </Link>
        </div>
        <button
          type="submit"
          className="btn btn-primary auth-submit"
          disabled={pending || oauthPending}
        >
          {pending ? "Signing in…" : "Sign in"}
        </button>
      </form>

      {state.error ? <p className="mw-msg-error">{state.error}</p> : null}
      {oauthError ? <p className="mw-msg-error">{oauthError}</p> : null}

      <p className="auth-alt">
        Starting a new school?{" "}
        <Link href="/signup" className="btn-text">
          Choose a plan
        </Link>
      </p>
      <div className="invite-callout">
        Joining a team? Use the invite link your admin sent — open it from your
        email to set a password and join.
      </div>
      <MarketingWowLegalLinks />
    </>
  );
}

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.2 6.1 29.4 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.4-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="M6.3 14.7l6.6 4.8C14.7 16 19 12 24 12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.2 6.1 29.4 4 24 4 16.3 4 9.6 8.3 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.2 0 10-2 13.6-5.2l-6.3-5.3C29.3 35.1 26.8 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.3 4.1-4.1 5.5l6.3 5.3C39.4 36.2 44 31.3 44 24c0-1.2-.1-2.4-.4-3.5z"
      />
    </svg>
  );
}
