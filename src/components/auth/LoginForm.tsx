"use client";

import { useActionState } from "react";
import Link from "next/link";
import { KeyRound, Loader2, Lock } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  signInWithEmailAction,
  signInWithPasswordAction,
  submitFoundingAccessCodeAction,
  type AuthActionState,
} from "@/lib/auth/actions";
import { SocialSignInButtons } from "@/components/auth/SocialSignInButtons";
import { cn } from "@/lib/utils/cn";

const initialState: AuthActionState = {
  error: null,
  success: false,
  message: null,
};

interface LoginFormProps {
  inviteToken?: string | null;
  defaultEmail?: string;
  variant?: "default" | "studio";
  nextPath?: string | null;
  setupIntent?: boolean;
  foundingCodeRetry?: boolean;
}

export function LoginForm({
  inviteToken = null,
  defaultEmail = "",
  variant = "default",
  nextPath = null,
  setupIntent = false,
  foundingCodeRetry = false,
}: LoginFormProps) {
  const isNewSchoolSignup = setupIntent && !inviteToken;
  const [passwordState, passwordAction, passwordPending] = useActionState(
    signInWithPasswordAction,
    initialState,
  );
  const [magicState, magicAction, magicPending] = useActionState(
    signInWithEmailAction,
    initialState,
  );
  const [retryState, retryAction, retryPending] = useActionState(
    submitFoundingAccessCodeAction,
    initialState,
  );

  const isStudio = variant === "studio";
  const isPending = foundingCodeRetry
    ? retryPending
    : isNewSchoolSignup
      ? magicPending
      : passwordPending;
  const state = foundingCodeRetry
    ? retryState
    : isNewSchoolSignup
      ? magicState
      : passwordState;

  if (foundingCodeRetry) {
    return (
      <div className="space-y-5">
        <form action={retryAction} className="space-y-5">
          <Input
            name="accessCode"
            label="Founding access code"
            type="text"
            placeholder="Enter your partner code"
            required
            autoComplete="off"
            variant={isStudio ? "studio" : "default"}
          />

          <Button
            type="submit"
            className={cn("w-full", isStudio && "tracking-wide uppercase")}
            size={isStudio ? "lg" : "md"}
            disabled={isPending}
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Verifying…
              </>
            ) : (
              <>
                <KeyRound className="h-4 w-4" strokeWidth={1.5} />
                Continue to organization setup
              </>
            )}
          </Button>
        </form>

        {state.error && (
          <p className="text-sm text-cos-error-text">{state.error}</p>
        )}
      </div>
    );
  }

  if (isNewSchoolSignup) {
    return (
      <div className="space-y-5">
        <form action={magicAction} className="space-y-5">
          {nextPath && <input type="hidden" name="next" value={nextPath} />}
          <input type="hidden" name="setupIntent" value="true" />

          <Input
            name="email"
            label="Email"
            type="email"
            defaultValue={defaultEmail}
            placeholder="you@yourorg.com"
            required
            autoComplete="email"
            variant={isStudio ? "studio" : "default"}
          />

          <Input
            name="accessCode"
            label="Founding access code"
            type="text"
            placeholder="Enter your partner code"
            required
            autoComplete="off"
            variant={isStudio ? "studio" : "default"}
          />

          <Button
            type="submit"
            className={cn("w-full", isStudio && "tracking-wide uppercase")}
            size={isStudio ? "lg" : "md"}
            disabled={isPending}
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Sending link…
              </>
            ) : (
              <>
                <KeyRound className="h-4 w-4" strokeWidth={1.5} />
                Create workspace
              </>
            )}
          </Button>

          <p className="text-center text-xs leading-relaxed text-cos-muted">
            We&apos;ll email you a link to create your account and continue to
            organization setup. A valid founding access code is required.
          </p>
        </form>

        {state.error && (
          <p className="text-sm text-cos-error-text">{state.error}</p>
        )}

        {state.success && state.message && (
          <p className="border border-cos-success/30 bg-cos-success-bg px-4 py-3 text-sm text-cos-success-text">
            {state.message}
          </p>
        )}

        <Link
          href="/login"
          className="block w-full text-center text-sm text-cos-muted transition-colors hover:text-cos-text"
        >
          Already have an account? Sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <SocialSignInButtons
        inviteToken={inviteToken}
        nextPath={nextPath}
        variant={variant}
        setupIntent={setupIntent}
      />

      <form action={passwordAction} className="space-y-5">
        {inviteToken && (
          <input type="hidden" name="inviteToken" value={inviteToken} />
        )}
        {nextPath && <input type="hidden" name="next" value={nextPath} />}

        <Input
          name="email"
          label="Email"
          type="email"
          defaultValue={defaultEmail}
          placeholder="you@yourorg.com"
          required
          autoComplete="email"
          variant={isStudio ? "studio" : "default"}
        />

        <Input
          name="password"
          label="Password"
          type="password"
          placeholder="Password"
          required
          autoComplete="current-password"
          variant={isStudio ? "studio" : "default"}
        />

        <Button
          type="submit"
          className={cn("w-full", isStudio && "tracking-wide uppercase")}
          size={isStudio ? "lg" : "md"}
          disabled={isPending}
        >
          {isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Signing in…
            </>
          ) : (
            <>
              <Lock className="h-4 w-4" strokeWidth={1.5} />
              Sign in
            </>
          )}
        </Button>

        <p className="text-center text-xs leading-relaxed text-cos-muted">
          {inviteToken
            ? "New to Hey Ralli? Open your invite link to create a password first. Already have an account? Sign in here to join."
            : "Your admin creates accounts in Settings → Team and shares email + password with you."}
        </p>
      </form>

      {state.error && (
        <p className="text-sm text-cos-error-text">{state.error}</p>
      )}
    </div>
  );
}
