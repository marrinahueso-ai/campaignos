"use client";

import { useActionState } from "react";
import { Loader2, Mail } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  signInWithEmailAction,
  type AuthActionState,
} from "@/lib/auth/actions";
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
}

export function LoginForm({
  inviteToken = null,
  defaultEmail = "",
  variant = "default",
}: LoginFormProps) {
  const [state, formAction, isPending] = useActionState(
    signInWithEmailAction,
    initialState,
  );

  const isStudio = variant === "studio";

  return (
    <form action={formAction} className="space-y-5">
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

      {state.error && (
        <p className="text-sm text-cos-error-text">{state.error}</p>
      )}

      {state.success && state.message && (
        <p className="border border-cos-success/30 bg-cos-success-bg px-4 py-3 text-sm text-cos-success-text">
          {state.message}
        </p>
      )}

      <p className="text-center text-xs leading-relaxed text-cos-muted">
        No password needed — we email you a secure link.
      </p>
    </form>
  );
}
