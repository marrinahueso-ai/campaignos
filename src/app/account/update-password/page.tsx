"use client";

import { useActionState } from "react";
import Link from "next/link";
import {
  updatePasswordFromRecoveryAction,
  type AuthActionState,
} from "@/lib/auth/actions";
import { MarketingWowAuthShell } from "@/components/marketing-wow/MarketingWowAuthShell";
import { MarketingWowLegalLinks } from "@/components/marketing-wow/MarketingWowAuthShell";

const initialState: AuthActionState = {
  error: null,
  success: false,
  message: null,
};

export default function UpdatePasswordPage() {
  const [state, action, pending] = useActionState(
    updatePasswordFromRecoveryAction,
    initialState,
  );

  return (
    <MarketingWowAuthShell
      imageSrc="/images/pricing-community.png"
      visualTitle="Choose a new password."
      visualSupport="You’re in via a secure reset link. Set something you’ll remember — then get back to calm."
    >
      <h1>Set new password</h1>
      <p className="sub">
        Pick a new password for your Hey Ralli account. Use at least 8
        characters.
      </p>

      <form action={action}>
        <div className="field">
          <label htmlFor="new-password">New password</label>
          <input
            id="new-password"
            name="password"
            type="password"
            autoComplete="new-password"
            placeholder="At least 8 characters"
            required
            minLength={8}
          />
        </div>
        <div className="field">
          <label htmlFor="confirm-password">Confirm password</label>
          <input
            id="confirm-password"
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
          {pending ? "Saving…" : "Save password & continue"}
        </button>
      </form>

      {state.error ? <p className="mw-msg-error">{state.error}</p> : null}

      <p className="auth-alt">
        <Link href="/login" className="btn-text">
          Back to log in
        </Link>
      </p>
      <MarketingWowLegalLinks />
    </MarketingWowAuthShell>
  );
}
