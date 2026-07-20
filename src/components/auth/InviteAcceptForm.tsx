"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Loader2, Lock } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  completeInviteSetupAction,
  type AuthActionState,
} from "@/lib/auth/actions";

const initialState: AuthActionState = {
  error: null,
  success: false,
  message: null,
};

interface InviteAcceptFormProps {
  inviteToken: string;
  email: string;
  organizationName: string;
  roleLabel: string;
  expired?: boolean;
  accountExists?: boolean;
}

export function InviteAcceptForm({
  inviteToken,
  email,
  organizationName,
  roleLabel,
  expired = false,
  accountExists = false,
}: InviteAcceptFormProps) {
  const [state, action, pending] = useActionState(
    completeInviteSetupAction,
    initialState,
  );

  if (expired) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-cos-error-text">
          This invite has expired. Ask your admin to resend the invitation.
        </p>
        <Link
          href="/login"
          className="block text-center text-sm text-cos-muted hover:text-cos-text"
        >
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-cos-muted">
          {organizationName}
        </p>
        <h2 className="mt-2 font-serif text-2xl font-medium text-cos-text">
          {accountExists ? "Set your password" : "Create your password"}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-cos-muted">
          Joining as <strong className="text-cos-text">{roleLabel}</strong>.
          Your username is your email.
          {accountExists
            ? " An account already exists for this email — choose a password to continue (useful for local email sign-in)."
            : null}
        </p>
      </div>

      <form action={action} className="space-y-4">
        <input type="hidden" name="inviteToken" value={inviteToken} />

        <Input
          name="email"
          label="Email"
          type="email"
          value={email}
          readOnly
          autoComplete="username"
        />

        <Input
          name="password"
          label="Password"
          type="password"
          placeholder="At least 8 characters"
          required
          minLength={8}
          autoComplete="new-password"
        />

        <Input
          name="confirmPassword"
          label="Confirm password"
          type="password"
          placeholder="Re-enter password"
          required
          minLength={8}
          autoComplete="new-password"
        />

        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {accountExists ? "Updating account…" : "Creating account…"}
            </>
          ) : (
            <>
              <Lock className="h-4 w-4" strokeWidth={1.5} />
              Accept invite &amp; continue
            </>
          )}
        </Button>
      </form>

      {accountExists ? (
        <p className="text-center text-sm text-cos-muted">
          Already know your password?{" "}
          <Link
            href={`/login?invite=${encodeURIComponent(inviteToken)}`}
            className="font-semibold text-cos-text underline-offset-2 hover:underline"
          >
            Sign in instead
          </Link>
        </p>
      ) : null}

      {state.error && (
        <p className="text-sm text-cos-error-text">{state.error}</p>
      )}
    </div>
  );
}
