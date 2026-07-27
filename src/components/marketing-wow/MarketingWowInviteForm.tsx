"use client";

import { useActionState } from "react";
import Link from "next/link";
import {
  completeInviteSetupAction,
  type AuthActionState,
} from "@/lib/auth/actions";
import { MarketingWowLegalLinks } from "@/components/marketing-wow/MarketingWowAuthShell";

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

  if (expired) {
    return (
      <>
        <h1>Invite expired</h1>
        <p className="sub">
          This invite has expired. Ask your admin to resend the invitation.
        </p>
        <p className="auth-alt">
          <Link href="/login" className="btn-text">
            Back to log in
          </Link>
        </p>
        <MarketingWowLegalLinks />
      </>
    );
  }

  if (accountExists) {
    return (
      <>
        <h1>Sign in to join</h1>
        <p className="sub">
          Joining <strong>{organizationName}</strong> as{" "}
          <strong>{roleLabel}</strong>.
        </p>
        <div className="invite-callout" style={{ marginTop: 22 }}>
          An account already exists for <strong>{email}</strong>. Sign in with
          your existing password or Google — we’ll add this team automatically.
        </div>
        <Link
          href={`/login?invite=${encodeURIComponent(inviteToken)}`}
          className="btn btn-primary auth-submit"
          style={{ display: "inline-flex" }}
        >
          Sign in to join
        </Link>
        <MarketingWowLegalLinks />
      </>
    );
  }

  return (
    <>
      <h1>Accept invite</h1>
      <p className="sub">
        Joining <strong>{organizationName}</strong> as{" "}
        <strong>{roleLabel}</strong>.
      </p>

      <div className="invite-callout" style={{ marginTop: 22 }}>
        Use <strong>{email}</strong> — the email this invite was sent to.
      </div>

      <form action={action}>
        <input type="hidden" name="inviteToken" value={inviteToken} />
        <div className="field">
          <label htmlFor="invite-password">Create password</label>
          <input
            id="invite-password"
            name="password"
            type="password"
            autoComplete="new-password"
            placeholder="Create a password"
            required
            minLength={8}
          />
        </div>
        <div className="field">
          <label htmlFor="invite-password2">Confirm password</label>
          <input
            id="invite-password2"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            placeholder="Re-enter password"
            required
            minLength={8}
          />
        </div>
        <button
          type="submit"
          className="btn btn-primary auth-submit"
          disabled={pending}
        >
          {pending ? "Joining…" : "Join workspace"}
        </button>
      </form>

      {state.error ? <p className="mw-msg-error">{state.error}</p> : null}

      <p className="auth-alt">
        Already have an account?{" "}
        <Link
          href={`/login?invite=${encodeURIComponent(inviteToken)}`}
          className="btn-text"
        >
          Sign in to join
        </Link>
      </p>
      <MarketingWowLegalLinks />
    </>
  );
}
