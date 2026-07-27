"use client";

import { useActionState } from "react";
import Link from "next/link";
import {
  requestPasswordResetAction,
  type AuthActionState,
} from "@/lib/auth/actions";
import { MarketingWowLegalLinks } from "@/components/marketing-wow/MarketingWowAuthShell";

const initialState: AuthActionState = {
  error: null,
  success: false,
  message: null,
};

export function MarketingWowForgotForm() {
  const [state, action, pending] = useActionState(
    requestPasswordResetAction,
    initialState,
  );

  return (
    <>
      <h1>Forgot password</h1>
      <p className="sub">
        Enter the email on your account. We’ll send a secure reset link if it
        matches a workspace.
      </p>

      <form action={action}>
        <div className="field">
          <label htmlFor="forgot-email">Email</label>
          <input
            id="forgot-email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@yourorg.com"
            required
          />
        </div>
        <button
          type="submit"
          className="btn btn-primary auth-submit"
          disabled={pending}
        >
          {pending ? "Sending…" : "Send reset link"}
        </button>
      </form>

      {state.error ? <p className="mw-msg-error">{state.error}</p> : null}
      {state.success && state.message ? (
        <p className="mw-msg-success">{state.message}</p>
      ) : null}

      <p className="auth-alt">
        Remembered it?{" "}
        <Link href="/login" className="btn-text">
          Back to log in
        </Link>
      </p>
      <div className="invite-callout">
        Invited with a temporary password? Prefer your invite link’s “set
        password” step — it won’t treat this as a reset of someone else’s
        account.
      </div>
      <MarketingWowLegalLinks />
    </>
  );
}
