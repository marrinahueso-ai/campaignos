"use client";

import { useState, useTransition } from "react";
import {
  finishOnboardingPromptsAction,
  sendOnboardingInviteAction,
  skipOnboardingPromptAction,
} from "@/lib/onboarding/actions";
import { OnboardingProgress } from "@/components/onboarding/OnboardingProgress";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export function OnboardingInviteForm() {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="mx-auto max-w-lg space-y-8 px-4 py-10">
      <OnboardingProgress current="invite" />
      <div>
        <h1 className="font-display text-3xl text-cos-text sm:text-4xl">
          Invite your team
        </h1>
        <p className="mt-2 text-sm text-cos-muted">
          Add a PTO admin now, or do this later from Team & Access.
        </p>
      </div>

      <form
        className="space-y-4"
        action={(formData) => {
          startTransition(async () => {
            setError(null);
            const result = await sendOnboardingInviteAction(formData);
            if (result?.error) {
              setError(result.error);
            }
          });
        }}
      >
        <div>
          <label className="mb-1.5 block text-sm font-medium" htmlFor="fullName">
            Name
          </label>
          <Input id="fullName" name="fullName" placeholder="Jamie Rivera" />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium" htmlFor="email">
            Email
          </label>
          <Input
            id="email"
            name="email"
            type="email"
            required
            placeholder="jamie@schoolpto.org"
          />
        </div>
        {error ? (
          <p className="text-sm text-red-700" role="alert">
            {error}
          </p>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={isPending}>
            {isPending ? "Sending…" : "Send invites"}
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={isPending}
            onClick={() =>
              startTransition(async () => {
                await skipOnboardingPromptAction("invite");
              })
            }
          >
            Do this later
          </Button>
          <Button
            type="button"
            variant="ghost"
            disabled={isPending}
            onClick={() =>
              startTransition(async () => {
                await finishOnboardingPromptsAction();
              })
            }
          >
            Go to home
          </Button>
        </div>
      </form>
    </div>
  );
}
