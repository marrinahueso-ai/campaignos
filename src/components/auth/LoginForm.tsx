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
}

export function LoginForm({
  inviteToken = null,
  defaultEmail = "",
  variant = "default",
  nextPath = null,
}: LoginFormProps) {
  const [mode, setMode] = useState<"password" | "magic">("password");
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
      <SocialSignInButtons inviteToken={inviteToken} variant={variant} />

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
          Email & password
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
            Your admin creates accounts in Settings → Team and shares email +
            password with you.
          </p>
        </form>
      ) : (
        <form action={magicAction} className="space-y-5">
          {inviteToken && (
            <input type="hidden" name="inviteToken" value={inviteToken} />
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
                Email me a sign-in link
              </>
            )}
          </Button>

          <p className="text-center text-xs leading-relaxed text-cos-muted">
            Magic links require Supabase email delivery. Use email & password
            unless your admin has SMTP configured.
          </p>
        </form>
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
