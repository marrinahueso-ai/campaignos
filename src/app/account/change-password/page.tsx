"use client";

import { useActionState } from "react";
import { Loader2, Lock } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  changePasswordAction,
  type AuthActionState,
} from "@/lib/auth/actions";

const initialState: AuthActionState = {
  error: null,
  success: false,
};

export default function ChangePasswordPage() {
  const [state, action, pending] = useActionState(
    changePasswordAction,
    initialState,
  );

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#ebe4d9] px-4 py-12">
      <div className="w-full max-w-md space-y-5 rounded-2xl border border-[#ddd4c8] bg-[#f6f2eb] p-8 shadow-sm">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#5c554c]">
            Hey Ralli
          </p>
          <h1 className="mt-2 font-serif text-2xl font-medium text-[#2a2622]">
            Choose a new password
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-[#5c554c]">
            Your admin created a temporary password. Set your own before
            continuing.
          </p>
        </div>

        <form action={action} className="space-y-4">
          <Input
            name="password"
            label="New password"
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
                Saving…
              </>
            ) : (
              <>
                <Lock className="h-4 w-4" strokeWidth={1.5} />
                Save password &amp; continue
              </>
            )}
          </Button>
        </form>

        {state.error && (
          <p className="text-sm text-red-700">{state.error}</p>
        )}
      </div>
    </main>
  );
}
