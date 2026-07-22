"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import {
  completeOnboardingCalendarAction,
  skipOnboardingPromptAction,
} from "@/lib/onboarding/actions";
import { OnboardingProgress } from "@/components/onboarding/OnboardingProgress";
import { Button } from "@/components/ui/Button";

interface EventOnboardingPromptProps {
  step: "calendar" | "brand" | "invite";
}

export function EventOnboardingPrompt({ step }: EventOnboardingPromptProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  if (step !== "calendar") {
    return null;
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-cos-border bg-cos-card/95 p-4 shadow-[0_-8px_30px_rgba(15,46,56,0.12)] backdrop-blur sm:bottom-6 sm:left-1/2 sm:max-w-xl sm:-translate-x-1/2 sm:rounded-2xl sm:border">
      <OnboardingProgress current="calendar" className="mb-3" />
      <h2 className="font-display text-xl text-cos-text">
        Save hours by importing your school calendar
      </h2>
      <p className="mt-1 text-sm text-cos-muted">
        Your event is ready. Pull in the rest of the year when you want — or do
        this later from Today.
      </p>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <Button
          type="button"
          size="md"
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              await completeOnboardingCalendarAction();
            })
          }
        >
          Import calendar
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="md"
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              await skipOnboardingPromptAction("calendar");
            })
          }
        >
          Do this later
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="md"
          disabled={isPending}
          onClick={() => router.replace(window.location.pathname)}
        >
          Stay on event
        </Button>
      </div>
    </div>
  );
}
