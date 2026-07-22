"use client";

import { useMemo, useState } from "react";
import { startValueFirstOnboardingAction } from "@/lib/onboarding/actions";
import { OnboardingProgress } from "@/components/onboarding/OnboardingProgress";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

interface OnboardingWelcomeProps {
  errorMessage?: string | null;
  defaultTimezone: string;
}

export function OnboardingWelcome({
  errorMessage,
  defaultTimezone,
}: OnboardingWelcomeProps) {
  const [schoolName, setSchoolName] = useState("");
  const timezone = useMemo(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || defaultTimezone;
    } catch {
      return defaultTimezone;
    }
  }, [defaultTimezone]);

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-lg flex-col justify-center px-4 py-12">
      <OnboardingProgress current="event" className="mb-8" />
      <p className="studio-eyebrow">Welcome to Hey Ralli</p>
      <h1 className="font-display mt-2 text-4xl text-cos-text sm:text-5xl">
        What event are you planning first?
      </h1>
      <p className="mt-4 text-base text-cos-muted">
        Create one real event in under a minute. You can import your calendar,
        brand, and team anytime after — everything else is skippable.
      </p>

      <form action={startValueFirstOnboardingAction} className="mt-8 space-y-4">
        <div>
          <label
            htmlFor="schoolName"
            className="mb-1.5 block text-sm font-medium text-cos-text"
          >
            School or PTO name{" "}
            <span className="font-normal text-cos-muted">(optional)</span>
          </label>
          <Input
            id="schoolName"
            name="schoolName"
            value={schoolName}
            onChange={(event) => setSchoolName(event.target.value)}
            placeholder="e.g. Edmondson Elementary PTO"
            autoComplete="organization"
          />
        </div>
        <input type="hidden" name="timezone" value={timezone} />
        {errorMessage ? (
          <p className="text-sm text-red-700" role="alert">
            {errorMessage}
          </p>
        ) : null}
        <Button type="submit" size="lg" className="w-full">
          Create my first event
        </Button>
      </form>
    </div>
  );
}
