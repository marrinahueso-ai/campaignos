"use client";

import { useActionState, useState, useTransition } from "react";
import Link from "next/link";
import {
  completeInviteSetupAction,
  getOAuthSignInUrl,
  type AuthActionState,
} from "@/lib/auth/actions";
import {
  MarketingAuthBackLink,
  MarketingAuthLegalNote,
} from "@/components/marketing-wow/MarketingAuthCardShell";
import {
  AuthDivider,
  AuthErrorMessage,
  GoogleMark,
  authInputClassName,
  authLabelClassName,
  authPrimaryButtonClassName,
  authSecondaryButtonClassName,
  authSubClassName,
  authTitleClassName,
} from "@/components/marketing-wow/marketing-auth-ui";

const initialState: AuthActionState = {
  error: null,
  success: false,
  message: null,
};

interface MarketingWowInviteFormProps {
  inviteToken: string;
  email: string;
  organizationName: string;
  roleLabel: string;
  expired?: boolean;
  accountExists?: boolean;
}

export function MarketingWowInviteForm({
  inviteToken,
  email,
  organizationName,
  roleLabel,
  expired = false,
  accountExists = false,
}: MarketingWowInviteFormProps) {
  const [state, action, pending] = useActionState(
    completeInviteSetupAction,
    initialState,
  );
  const [oauthError, setOauthError] = useState<string | null>(null);
  const [oauthPending, startOauth] = useTransition();

  function continueWithGoogle() {
    startOauth(async () => {
      setOauthError(null);
      const result = await getOAuthSignInUrl("google", inviteToken, null);
      if ("error" in result) {
        setOauthError(result.error);
        return;
      }
      window.location.assign(result.url);
    });
  }

  if (expired) {
    return (
      <>
        <h1 className={authTitleClassName}>Invite expired</h1>
        <p className={authSubClassName}>
          This invite has expired. Ask your admin to resend the invitation.
        </p>
        <p className="mt-8 text-center text-sm text-cos-muted">
          <Link href="/login" className="font-bold text-cos-text hover:underline">
            Back to log in
          </Link>
        </p>
        <MarketingAuthLegalNote />
      </>
    );
  }

  if (accountExists) {
    return (
      <>
        <MarketingAuthBackLink href="/invite" label="Back" />
        <div className="mt-4 text-center">
          <h1 className={authTitleClassName}>
            You’ve been invited to {organizationName}.
          </h1>
          <p className="mt-4 text-[10px] font-bold tracking-[0.2em] text-cos-muted uppercase">
            As {roleLabel}
          </p>
          <p className="mt-6 text-sm leading-relaxed text-cos-muted">
            An account already exists for{" "}
            <strong className="text-cos-text">{email}</strong>. Sign in with your
            existing password or Google — we’ll add{" "}
            <strong className="text-cos-text">{organizationName}</strong> to your
            account.
          </p>
        </div>

        <button
          type="button"
          className={`${authSecondaryButtonClassName} mt-8`}
          disabled={oauthPending}
          onClick={continueWithGoogle}
        >
          <GoogleMark />
          {oauthPending ? "Connecting…" : "Continue with Google"}
        </button>

        <Link
          href={`/login?invite=${encodeURIComponent(inviteToken)}`}
          className={`${authPrimaryButtonClassName} mt-3 inline-flex items-center justify-center text-center`}
        >
          Sign in to join
        </Link>

        <AuthErrorMessage>{oauthError}</AuthErrorMessage>
        <MarketingAuthLegalNote />
      </>
    );
  }

  return (
    <>
      <MarketingAuthBackLink href="/invite" label="Back" />

      <div className="mt-4 text-center">
        <h1 className={authTitleClassName}>
          You’ve been invited to {organizationName}.
        </h1>
        <p className="mt-4 text-[10px] font-bold tracking-[0.2em] text-cos-muted uppercase">
          As {roleLabel}
        </p>
        <p className="mt-4 text-sm text-cos-muted">
          Use <strong className="text-cos-text">{email}</strong> — the email this
          invite was sent to.
        </p>
      </div>

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

      <form action={action} className="space-y-4">
        <input type="hidden" name="inviteToken" value={inviteToken} />
        <div>
          <label htmlFor="invite-password" className={authLabelClassName}>
            Create password
          </label>
          <input
            id="invite-password"
            name="password"
            type="password"
            autoComplete="new-password"
            placeholder="Create a password"
            required
            minLength={8}
            className={authInputClassName}
          />
        </div>
        <div>
          <label htmlFor="invite-password2" className={authLabelClassName}>
            Confirm password
          </label>
          <input
            id="invite-password2"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            placeholder="Re-enter password"
            required
            minLength={8}
            className={authInputClassName}
          />
        </div>
        <button
          type="submit"
          className={authPrimaryButtonClassName}
          disabled={pending || oauthPending}
        >
          {pending ? "Joining…" : `Join ${organizationName}`}
        </button>
      </form>

      <AuthErrorMessage>{state.error}</AuthErrorMessage>
      <AuthErrorMessage>{oauthError}</AuthErrorMessage>

      <p className="mt-6 text-center text-sm text-cos-muted">
        Already have an account?{" "}
        <Link
          href={`/login?invite=${encodeURIComponent(inviteToken)}`}
          className="font-bold text-cos-text hover:underline"
        >
          Sign in to join
        </Link>
      </p>

      <MarketingAuthLegalNote />
    </>
  );
}
