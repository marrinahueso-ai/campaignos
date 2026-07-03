"use client";

import { useActionState, useState } from "react";
import { Loader2, Lock, Mail } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  signInWithEmailAction,
  signInWithPasswordAction,
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
}

export function LoginForm({
  inviteToken = null,
  defaultEmail = "",
  variant = "default",
  nextPath = null,
  setupIntent = false,
}: LoginFormProps) {
  const isNewSchoolSignup = setupIntent && !inviteToken;
  const [showEmailSignIn, setShowEmailSignIn] = useState(!isNewSchoolSignup);
  const [mode, setMode] = useState<"password" | "magic">(
    isNewSchoolSignup ? "magic" : "password",
  );
  const [passwordState, passwordAction, passwordPending] = useActionState(
    signInWithPasswordAction,
    initialState,
  );
  const [magicState, magicAction, magicPending] = useActionState(
    signInWithEmailAction,
    initialState,
  );

  const isStudio = variant === "studio";
  const isPending = mode === "password" ? passwordPending : magicPending;
  const state = mode === "password" ? passwordState : magicState;

  return (
    <div className="space-y-5">
      <SocialSignInButtons
        inviteToken={inviteToken}
        nextPath={nextPath}
        variant={variant}
        setupIntent={setupIntent}
      />

      {isNewSchoolSignup && !showEmailSignIn ? (
        <button
          type="button"
          onClick={() => setShowEmailSignIn(true)}
          className="block w-full text-center text-sm text-cos-muted transition-colors hover:text-cos-text"
        >
          Already have an account? Sign in with email
        </button>
      ) : (
        <>
          {isNewSchoolSignup && (
            <p className="text-center text-xs leading-relaxed text-cos-muted">
              New here? Use Google or Facebook above to create your workspace.
            </p>
          )}

          <div className="flex rounded-xl border border-cos-border bg-cos-bg/40 p-1">
            <button
              type="button"
              className={cn(
                "flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                mode === "password"
                  ? "bg-white text-cos-text shadow-sm"
                  : "text-cos-muted hover:text-cos-text",
              )}
              onClick={() => setMode("password")}
            >
              {isNewSchoolSignup ? "Sign in" : "Email & password"}
            </button>
            <button
              type="button"
              className={cn(
                "flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                mode === "magic"
                  ? "bg-white text-cos-text shadow-sm"
                  : "text-cos-muted hover:text-cos-text",
              )}
              onClick={() => setMode("magic")}
            >
              Magic link
            </button>
          </div>

          {mode === "password" ? (
            <form action={passwordAction} className="space-y-5">
              {nextPath && (
                <input type="hidden" name="next" value={nextPath} />
              )}
              <Input
                name="email"
                label="Email"
                type="email"
                defaultValue={defaultEmail}
                placeholder="you@schoolpto.org"
                required
                autoComplete="email"
                variant={isStudio ? "studio" : "default"}
              />

              <Input
                name="password"
                label="Password"
                type="password"
                placeholder="Your temporary password"
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
                {isNewSchoolSignup
                  ? "Returning user? Sign in with the email and password your admin shared."
                  : "Your admin creates accounts in Settings → Team and shares email + password with you."}
              </p>
            </form>
          ) : (
            <form action={magicAction} className="space-y-5">
              {inviteToken && (
                <input type="hidden" name="inviteToken" value={inviteToken} />
              )}
              {nextPath && (
                <input type="hidden" name="next" value={nextPath} />
              )}
              {setupIntent && (
                <input type="hidden" name="setupIntent" value="true" />
              )}

              <Input
                name="email"
                label="Email"
                type="email"
                defaultValue={defaultEmail}
                placeholder="you@schoolpto.org"
                required
                autoComplete="email"
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
                    <Mail className="h-4 w-4" strokeWidth={1.5} />
                    {isNewSchoolSignup
                      ? "Email me a sign-up link"
                      : "Email me a sign-in link"}
                  </>
                )}
              </Button>

              <p className="text-center text-xs leading-relaxed text-cos-muted">
                {inviteToken
                  ? "Magic links work on invite links. Use the invited email, or sign in with Google above."
                  : isNewSchoolSignup
                    ? "We'll email you a link to create your account and continue to school setup."
                    : "Magic links require an existing account. Use Google sign-in or the email & password your admin shared."}
              </p>
            </form>
          )}
        </>
      )}

      {state.error && (
        <p className="text-sm text-cos-error-text">{state.error}</p>
      )}

      {mode === "magic" && state.success && state.message && (
        <p className="border border-cos-success/30 bg-cos-success-bg px-4 py-3 text-sm text-cos-success-text">
          {state.message}
        </p>
      )}
    </div>
  );
}
