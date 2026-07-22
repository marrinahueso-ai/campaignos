"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  completeOnboardingCalendarAction,
  deferOnboardingPromptAction,
} from "@/lib/onboarding/actions";
import { OnboardingProgress } from "@/components/onboarding/OnboardingProgress";
import { Button } from "@/components/ui/Button";

type PromptStep = "calendar" | "brand" | "invite";

interface EventOnboardingPromptProps {
  step: PromptStep;
}

const COPY: Record<
  PromptStep,
  {
    title: string;
    body: string;
    primaryLabel: string;
  }
> = {
  calendar: {
    title: "Save hours by importing your school calendar",
    body: "Your event is ready. Pull in the rest of the year when you want — or do this later from Today.",
    primaryLabel: "Import calendar",
  },
  brand: {
    title: "Make every campaign look like your school",
    body: "Add logos and colors next — or skip ahead and invite a teammate.",
    primaryLabel: "Set up brand",
  },
  invite: {
    title: "Invite someone to help",
    body: "Bring in another board member when you’re ready — or finish setup and stay on this event.",
    primaryLabel: "Invite teammate",
  },
};

export function EventOnboardingPrompt({ step }: EventOnboardingPromptProps) {
  const router = useRouter();
  const pathname = usePathname();
  // Local step owns the overlay after defer so revalidation cannot snap back
  // to a stale `?onboarding=` search param mid-transition.
  const [activeStep, setActiveStep] = useState<PromptStep>(step);
  const [isPending, startTransition] = useTransition();
  const copy = COPY[activeStep];

  function dismissPrompt() {
    router.replace(pathname);
  }

  function goToStep(next: PromptStep) {
    setActiveStep(next);
    router.replace(`${pathname}?onboarding=${next}`);
  }

  function handlePrimary() {
    startTransition(async () => {
      if (activeStep === "calendar") {
        await completeOnboardingCalendarAction();
        return;
      }
      if (activeStep === "brand") {
        router.push("/onboarding/brand");
        return;
      }
      router.push("/onboarding/invite");
    });
  }

  function handleDefer() {
    startTransition(async () => {
      const result = await deferOnboardingPromptAction(activeStep);
      if (result.error) {
        return;
      }
      if (result.next) {
        goToStep(result.next);
        return;
      }
      // Fallback: if server already had this step settled (stale state), still
      // advance the visible stepper Calendar → Brand → Team before dismissing.
      const order: PromptStep[] = ["calendar", "brand", "invite"];
      const index = order.indexOf(activeStep);
      const fallback = index >= 0 ? order[index + 1] : undefined;
      if (fallback) {
        goToStep(fallback);
        return;
      }
      dismissPrompt();
    });
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-cos-border bg-cos-card/95 p-4 shadow-[0_-8px_30px_rgba(15,46,56,0.12)] backdrop-blur sm:bottom-6 sm:left-1/2 sm:max-w-xl sm:-translate-x-1/2 sm:rounded-2xl sm:border">
      <OnboardingProgress current={activeStep} className="mb-3" />
      <h2 className="font-display text-xl text-cos-text">{copy.title}</h2>
      <p className="mt-1 text-sm text-cos-muted">{copy.body}</p>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <Button
          type="button"
          size="md"
          disabled={isPending}
          onClick={handlePrimary}
        >
          {copy.primaryLabel}
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="md"
          disabled={isPending}
          onClick={handleDefer}
        >
          Do this later
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="md"
          disabled={isPending}
          onClick={dismissPrompt}
        >
          Stay on event
        </Button>
      </div>
    </div>
  );
}
