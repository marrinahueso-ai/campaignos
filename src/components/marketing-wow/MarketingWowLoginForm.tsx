"use client";

import { useActionState, useState, useTransition } from "react";
import Link from "next/link";
import {
  getOAuthSignInUrl,
  signInWithPasswordAction,
  type AuthActionState,
} from "@/lib/auth/actions";
import {
  AuthDivider,
  AuthErrorMessage,
  AuthSuccessMessage,
  GoogleMark,
  authInputClassName,
  authLabelClassName,
  authPrimaryButtonClassName,
  authSecondaryButtonClassName,
  authTitleClassName,
} from "@/components/marketing-wow/marketing-auth-ui";

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
  authNoticeMessage?: string | null;
}

export function MarketingWowLoginForm({
  inviteToken = null,
  defaultEmail = "",
  nextPath = null,
  authErrorMessage = null,
  authNoticeMessage = null,
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
      <h1 className={authTitleClassName}>Welcome back.</h1>

      <AuthErrorMessage className="mt-6">{authErrorMessage}</AuthErrorMessage>
      <AuthSuccessMessage className="mt-6">
        {authNoticeMessage}
      </AuthSuccessMessage>

      <button
        type="button"
        className={`${authSecondaryButtonClassName} mt-8`}
        disabled={oauthPending || pending}
        onClick={continueWithGoogle}
      >
        <GoogleMark />
        {oauthPending ? "Connecting…" : "Continue with Google"}
      </button>

      <AuthDivider />

      <form action={action} className="space-y-5">
        {inviteToken ? (
          <input type="hidden" name="inviteToken" value={inviteToken} />
        ) : null}
        {nextPath ? <input type="hidden" name="next" value={nextPath} /> : null}

        <div>
          <label htmlFor="login-email" className={authLabelClassName}>
            Email address
          </label>
          <input
            id="login-email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@school.edu"
            defaultValue={defaultEmail}
            required
            className={authInputClassName}
          />
        </div>
        <div>
          <div className="mb-2 ml-1 flex items-center justify-between">
            <label htmlFor="login-password" className={authLabelClassName}>
              Password
            </label>
            <Link
              href="/forgot-password"
              className="text-[10px] font-bold tracking-widest text-cos-muted uppercase transition-colors hover:text-cos-text"
            >
              Forgot password?
            </Link>
          </div>
          <input
            id="login-password"
            name="password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            required
            className={authInputClassName}
          />
        </div>
        <button
          type="submit"
          className={authPrimaryButtonClassName}
          disabled={pending || oauthPending}
        >
          {pending ? "Signing in…" : "Log in"}
        </button>
      </form>

      <AuthErrorMessage>{state.error}</AuthErrorMessage>
      <AuthErrorMessage>{oauthError}</AuthErrorMessage>

      <div className="mt-10 border-t border-cos-border pt-8 text-center">
        <p className="text-sm font-medium text-cos-muted">
          New to Hey Ralli?{" "}
          <Link
            href="/get-started"
            className="ml-1 font-bold tracking-widest text-cos-text uppercase transition-colors hover:text-cos-brand-sage"
          >
            Get started
          </Link>
        </p>
      </div>
    </>
  );
}
