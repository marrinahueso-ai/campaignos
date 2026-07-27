"use client";

import { useMemo, useState } from "react";
import { startValueFirstOnboardingAction } from "@/lib/onboarding/actions";

interface OnboardingWelcomeProps {
  errorMessage?: string | null;
  defaultTimezone: string;
}

/**
 * Minimal org bootstrap glue for first-time setup.
 * Not a Welcome step — mockup page 1 starts at Create your first event.
 * Quiet optional org name, then continue to `/events/create?onboarding=1`.
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
      className="-mx-4 -my-8 flex min-h-[calc(100vh-4rem)] flex-col justify-center px-5 pb-16 pt-5 lg:-mx-8 lg:-my-10 lg:px-5 bg-[radial-gradient(ellipse_80%_50%_at_10%_-10%,rgba(107,129,113,0.14),transparent_55%),radial-gradient(ellipse_60%_40%_at_90%_0%,rgba(196,146,46,0.11),transparent_50%),#f6f2eb]"
      data-onboarding-ease="bootstrap"
    >
      <div className="mx-auto w-full max-w-[480px]">
        <p className="mb-2 text-xs font-bold uppercase tracking-[0.06em] text-[#6b8171]">
          First-time setup
        </p>
        <h1
          className="m-0 text-[clamp(28px,4vw,36px)] font-semibold leading-[1.08] tracking-[-0.02em] text-[#2a2622]"
          style={{ fontFamily: "var(--font-fraunces), Georgia, serif" }}
        >
          Name your organization
        </h1>
        <p className="mt-2.5 max-w-[42ch] text-[15px] leading-normal text-[#5c554c]">
          Optional — you can change this anytime. Next you’ll create your first
          event.
        </p>

        <form
          action={startValueFirstOnboardingAction}
          className="mt-[26px] rounded-[22px] border border-[rgba(42,38,34,0.1)] bg-[#fffcf7] p-[22px] shadow-[0_8px_28px_rgba(28,36,48,0.06)]"
        >
          <div>
            <label
              htmlFor="schoolName"
              className="mb-1.5 block text-[13px] font-semibold text-[#2a2622]"
            >
              School or PTO name{" "}
              <span className="font-medium text-[#7a7166]">(optional)</span>
            </label>
            <input
              id="schoolName"
              name="schoolName"
              value={schoolName}
              onChange={(event) => setSchoolName(event.target.value)}
              placeholder="e.g. Edmondson Elementary PTO"
              autoComplete="organization"
              className="w-full rounded-[14px] border-[1.5px] border-[rgba(42,38,34,0.1)] bg-[#fffcf7] px-3.5 py-3 text-[15px] text-[#2a2622] outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-[#7a7166]/70 focus:border-[rgba(47,74,60,0.45)] focus:shadow-[0_0_0_3px_rgba(47,74,60,0.1)]"
            />
          </div>
          <input type="hidden" name="timezone" value={timezone} />
          {errorMessage ? (
            <p className="mt-3 text-sm text-red-700" role="alert">
              {errorMessage}
            </p>
          ) : null}
          <button
            type="submit"
            className="mt-5 inline-flex w-full items-center justify-center gap-1.5 rounded-full bg-[#2a2622] px-[22px] py-3.5 text-[15px] font-bold text-[#fffcf7] transition-transform duration-100 hover:-translate-y-px"
          >
            Continue to first event
          </button>
        </form>
      </div>
    </div>
  );
}
