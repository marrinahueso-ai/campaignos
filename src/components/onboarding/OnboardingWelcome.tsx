"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { School } from "lucide-react";
import { BrandLogo } from "@/components/brand/BrandLogo";
import {
  authInputClassName,
  authLabelClassName,
  authPrimaryButtonClassName,
} from "@/components/marketing-wow/marketing-auth-ui";
import { startValueFirstOnboardingAction } from "@/lib/onboarding/actions";

interface OnboardingWelcomeProps {
  errorMessage?: string | null;
  defaultTimezone: string;
}

/**
 * New School Handoff — bridge from founding signup into existing Ease onboarding.
 * CONTINUE runs the same retry-safe org bootstrap → `/events/create?onboarding=1`.
 */
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
    <div
      className="flex min-h-dvh flex-col items-center justify-center bg-cos-bg px-5 pb-16 pt-5"
      data-onboarding-ease="bootstrap"
    >
      <Link href="/" className="mb-10 md:mb-12">
        <BrandLogo href={null} variant="full" size="nav" />
      </Link>

      <div className="relative w-full max-w-[480px] rounded-[32px] border border-cos-border bg-cos-card p-8 text-center shadow-[0_8px_30px_-4px_rgba(42,38,34,0.04),0_4px_12px_-2px_rgba(42,38,34,0.02)] md:p-10">
        <div className="mx-auto mb-8 flex h-20 w-20 items-center justify-center rounded-full bg-cos-brand-sage-soft text-cos-brand-sage shadow-sm">
          <School className="h-9 w-9" aria-hidden />
        </div>

        <h1 className="font-display text-3xl leading-tight tracking-tight text-cos-text italic sm:text-4xl">
          Let’s set up your school.
        </h1>
        <p className="mx-auto mt-4 max-w-sm text-base font-medium leading-relaxed text-cos-muted">
          We’ll start with a few basics to get your workspace ready. You don’t
          need to have everything ready right now.
        </p>

        <form action={startValueFirstOnboardingAction} className="mt-10 space-y-6">
          <div className="text-left">
            <label htmlFor="schoolName" className={authLabelClassName}>
              School or PTO name{" "}
              <span className="normal-case tracking-normal text-cos-muted/80">
                (optional)
              </span>
            </label>
            <input
              id="schoolName"
              name="schoolName"
              value={schoolName}
              onChange={(event) => setSchoolName(event.target.value)}
              placeholder="e.g. Edmondson Elementary PTO"
              autoComplete="organization"
              className={authInputClassName}
            />
          </div>
          <input type="hidden" name="timezone" value={timezone} />
          {errorMessage ? (
            <p className="text-sm text-red-700" role="alert">
              {errorMessage}
            </p>
          ) : null}
          <button type="submit" className={authPrimaryButtonClassName}>
            Continue
          </button>
          <p className="text-[11px] font-bold tracking-[0.2em] text-cos-muted/60 uppercase leading-relaxed">
            You can change these details
            <br />
            anytime in your settings.
          </p>
        </form>

        <div
          className="mt-12 flex items-center justify-center gap-2"
          aria-hidden
        >
          <div className="h-1 w-8 rounded-full bg-cos-primary" />
          <div className="h-1 w-8 rounded-full bg-cos-border" />
          <div className="h-1 w-8 rounded-full bg-cos-border" />
        </div>
      </div>

      <p className="mt-8 text-[11px] font-bold tracking-widest text-cos-muted/60 uppercase">
        © {new Date().getFullYear()} Hey Ralli
      </p>
    </div>
  );
}
