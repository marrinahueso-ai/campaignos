"use client";

import { useActionState } from "react";
import Link from "next/link";
import {
  updatePasswordFromRecoveryAction,
  type AuthActionState,
} from "@/lib/auth/actions";
import {
  MarketingAuthBackLink,
  MarketingAuthCardShell,
} from "@/components/marketing-wow/MarketingAuthCardShell";
import {
  AuthErrorMessage,
  authInputClassName,
  authLabelClassName,
  authPrimaryButtonClassName,
  authSubClassName,
  authTitleClassName,
} from "@/components/marketing-wow/marketing-auth-ui";

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
    <MarketingAuthCardShell>
      <MarketingAuthBackLink href="/login" label="Back to login" />

      <h1 className={`${authTitleClassName} mt-4`}>Create new password.</h1>
      <p className={`${authSubClassName} mb-8`}>
        Choose a strong, unique password.
      </p>

      <form action={action} className="space-y-5">
        <div>
          <label htmlFor="new-password" className={authLabelClassName}>
            New password
          </label>
          <input
            id="new-password"
            name="password"
            type="password"
            autoComplete="new-password"
            placeholder="••••••••"
            required
            minLength={8}
            className={authInputClassName}
          />
        </div>
        <div>
          <label htmlFor="confirm-password" className={authLabelClassName}>
            Confirm password
          </label>
          <input
            id="confirm-password"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            placeholder="••••••••"
            required
            minLength={8}
            className={authInputClassName}
          />
        </div>
        <button
          type="submit"
          className={authPrimaryButtonClassName}
          disabled={pending}
        >
          {pending ? "Saving…" : "Update password"}
        </button>
      </form>

      <AuthErrorMessage>{state.error}</AuthErrorMessage>

      <p className="mt-8 text-center text-sm text-cos-muted">
        <Link href="/login" className="font-bold text-cos-text hover:underline">
          Back to log in
        </Link>
      </p>
    </MarketingAuthCardShell>
  );
}
