"use client";

import { useTransition } from "react";
import { restartOnboardingAction } from "@/lib/onboarding/actions";
import { Button } from "@/components/ui/Button";

export function RestartOnboardingButton() {
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          await restartOnboardingAction();
        })
      }
    >
      {isPending ? "Starting…" : "Start from the welcome screen"}
    </Button>
  );
}