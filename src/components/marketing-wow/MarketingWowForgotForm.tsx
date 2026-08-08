"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import {
  requestPasswordResetAction,
  type AuthActionState,
} from "@/lib/auth/actions";
import {
  MarketingAuthBackLink,
} from "@/components/marketing-wow/MarketingAuthCardShell";
import {
  AuthErrorMessage,
  authInputClassName,
  authLabelClassName,
  authPrimaryButtonClassName,
  authSubClassName,
  authTitleClassName,
} from "@/components/marketing-wow/marketing-auth-ui";
import { Send } from "lucide-react";

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
  const [submittedEmail, setSubmittedEmail] = useState("");

  if (state.success) {
    return (
      <div className="text-center">
        <div className="mx-auto mb-8 flex h-16 w-16 items-center justify-center rounded-full bg-cos-brand-sage-soft text-cos-brand-sage shadow-sm">
          <Send className="h-6 w-6" aria-hidden />
        </div>
        <h1 className={authTitleClassName}>Check your inbox.</h1>
        <p className={`${authSubClassName} mb-10`}>
          We’ve sent a password reset link to
          <br />
          <span className="font-bold text-cos-text italic">
            {submittedEmail || "your email"}
          </span>
        </p>
        {state.message ? (
          <p className="mb-6 text-sm text-cos-muted">{state.message}</p>
        ) : null}
        <div className="space-y-4">
          <button
            type="button"
            className={authPrimaryButtonClassName}
            onClick={() => window.location.reload()}
          >
            Resend email
          </button>
          <Link
            href="/login"
            className="block w-full rounded-xl py-4 text-sm font-bold tracking-widest text-cos-text uppercase transition-colors hover:bg-cos-bg-alt"
          >
            Back to login
          </Link>
        </div>
        <div className="mt-8 border-t border-cos-border pt-8">
          <p className="text-[11px] font-bold tracking-[0.2em] text-cos-muted/70 uppercase leading-relaxed">
            Didn’t receive it? Check your spam folder
            <br />
            or try a different address.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <MarketingAuthBackLink href="/login" label="Back to login" />

      <h1 className={`${authTitleClassName} mt-4`}>Reset your password.</h1>
      <p className={`${authSubClassName} mb-8`}>
        Enter your email and we’ll send a reset link.
      </p>

      <form
        action={action}
        className="space-y-6"
        onSubmit={(event) => {
          const data = new FormData(event.currentTarget);
          setSubmittedEmail(String(data.get("email") ?? "").trim());
        }}
      >
        <div>
          <label htmlFor="forgot-email" className={authLabelClassName}>
            Email address
          </label>
          <input
            id="forgot-email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@school.edu"
            required
            className={authInputClassName}
          />
        </div>
        <button
          type="submit"
          className={authPrimaryButtonClassName}
          disabled={pending}
        >
          {pending ? "Sending…" : "Send reset link"}
        </button>
      </form>

      <AuthErrorMessage>{state.error}</AuthErrorMessage>

      <div className="mt-8 text-center">
        <Link
          href="/login"
          className="text-[11px] font-bold tracking-[0.2em] text-cos-muted/70 uppercase transition-colors hover:text-cos-text"
        >
          Back to login
        </Link>
      </div>
    </>
  );
}
