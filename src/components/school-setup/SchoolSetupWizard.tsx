"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useActionState, useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, CheckCircle2, Sparkles } from "lucide-react";
import { SchoolSetupMetaStep } from "@/components/school-setup/SchoolSetupMetaStep";
import { SchoolSetupTeamStep } from "@/components/school-setup/SchoolSetupTeamStep";
import { WizardProgress } from "@/components/school-setup/WizardProgress";
import { WizardShell } from "@/components/school-setup/WizardShell";
import { Button } from "@/components/ui/Button";
import { FileUpload } from "@/components/ui/FileUpload";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import {
  completeSchoolSetup,
  type SchoolSetupFormState,
} from "@/lib/organizations/actions";
import type { MetaConnection } from "@/lib/meta-publishing/types";
import { COMMON_US_TIMEZONES } from "@/types/posting-preferences";
import type { OrganizationRole } from "@/types/organization-workspace";
import { cn } from "@/lib/utils/cn";

const STEPS = [
  "Welcome",
  "School",
  "Calendar",
  "Meta",
  "Team",
  "Finish",
];

/** Welcome + School + Calendar before org create. Brand lives at /onboarding/brand. */
const SETUP_STEP_COUNT = 3;
const META_STEP = 4;
const TEAM_STEP = 5;
const FINISH_STEP = 6;

const initialState: SchoolSetupFormState = { error: null, success: false };

function detectDefaultTimezone(): string {
  try {
    const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if ((COMMON_US_TIMEZONES as readonly string[]).includes(detected)) {
      return detected;
    }
  } catch {
    // ignore
  }
  return "America/Chicago";
}

interface SchoolSetupWizardProps {
  validatedAccessCode?: string | null;
  resumePostSetup?: boolean;
  /** Org already exists — calendar should deep-link to canonical `/calendar/import`. */
  hasOrganization?: boolean;
  metaConnection?: MetaConnection | null;
  metaConfiguredViaEnv?: boolean;
  metaIntegrationConfigured?: boolean;
  metaOauthError?: string | null;
  organizationRoles?: OrganizationRole[];
}

export function SchoolSetupWizard({
  validatedAccessCode = null,
  resumePostSetup = false,
  hasOrganization = false,
  metaConnection = null,
  metaConfiguredViaEnv = false,
  metaIntegrationConfigured = false,
  metaOauthError = null,
  organizationRoles = [],
}: SchoolSetupWizardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [step, setStep] = useState(resumePostSetup ? META_STEP : 1);
  const [hasCalendarFile, setHasCalendarFile] = useState(false);
  const [schoolNameError, setSchoolNameError] = useState<string | null>(null);
  const [timezoneError, setTimezoneError] = useState<string | null>(null);
  const [defaultTimezone] = useState(detectDefaultTimezone);
  const [state, formAction, isPending] = useActionState(
    completeSchoolSetup,
    initialState,
  );

  const setupComplete = state.success || resumePostSetup;
  /** Org exists (or just created) — Meta / Team / Finish no longer need createSchoolProfile. */
  const canContinuePostSetup = setupComplete || hasOrganization;

  useEffect(() => {
    const stepParam = searchParams.get("step");
    if (stepParam === "brand") {
      router.replace("/onboarding/brand");
      return;
    }
    if (stepParam === "meta") {
      setStep(META_STEP);
    } else if (stepParam === "school") {
      setStep(2);
    } else if (stepParam === "calendar") {
      setStep(3);
    }
  }, [searchParams, router]);

  useEffect(() => {
    if (resumePostSetup && searchParams.get("step") !== "meta") {
      setStep(META_STEP);
    }
  }, [resumePostSetup, searchParams]);

  useEffect(() => {
    if (state.success && step <= SETUP_STEP_COUNT) {
      setStep(META_STEP);
      router.replace("/settings/school-setup?onboarding=1");
      router.refresh();
    }
  }, [state.success, step, router]);

  useEffect(() => {
    if (step === FINISH_STEP && canContinuePostSetup) {
      const destination = hasCalendarFile
        ? "/calendar/review"
        : "/calendar/import";
      const timeout = setTimeout(() => {
        router.push(destination);
      }, 2500);

      return () => clearTimeout(timeout);
    }
  }, [step, canContinuePostSetup, hasCalendarFile, router]);

  const stepCopy = useMemo(
    () =>
      ({
        1: {
          title: "Welcome to Hey Ralli",
          description:
            "Set up your school profile once, and every PTO communication will stay on brand all year long.",
        },
        2: {
          title: "Tell us about your school",
          description:
            "School name and timezone are required. Everything else helps Hey Ralli sound like your community.",
        },
        3: {
          title: "Bring in your school calendar",
          description: hasOrganization
            ? "Use the same Import calendar page as everywhere else — Sign in with Google, an ICS subscribe feed, or a file upload. Review before dates go live."
            : "Same three options as Calendar → Import: Sign in with Google, an ICS subscribe feed, or a file upload. Add a feed or file now, or finish setup and import next.",
        },
        4: {
          title: "Connect Facebook & Instagram",
          description:
            "Optional — link Meta now for automatic publishing after approvals, or connect anytime in Settings.",
        },
        5: {
          title: "Invite your board",
          description:
            "Add VPs and committee chairs by email. Invites are optional — you can always invite later from Settings → Team.",
        },
        6: {
          title: "You're all set",
          description:
            "Import your calendar next (Google, ICS, or file), or go to Today whenever you're ready.",
        },
      })[step as 1 | 2 | 3 | 4 | 5 | 6] ?? {
        title: "Welcome to Hey Ralli",
        description:
          "Set up your school profile once, and every PTO communication will stay on brand all year long.",
      },
    [step, hasOrganization],
  );

  function validateSchoolStep(): boolean {
    const nameInput = document.querySelector<HTMLInputElement>('input[name="name"]');
    const timezoneSelect = document.querySelector<HTMLSelectElement>(
      'select[name="timezone"]',
    );

    let valid = true;

    if (!nameInput?.value.trim()) {
      setSchoolNameError("School name is required.");
      valid = false;
    } else {
      setSchoolNameError(null);
    }

    if (!timezoneSelect?.value.trim()) {
      setTimezoneError("Organization timezone is required.");
      valid = false;
    } else {
      setTimezoneError(null);
    }

    return valid;
  }

  function handleContinue() {
    if (step === 2 && !validateSchoolStep()) {
      return;
    }

    if (canContinuePostSetup && step >= META_STEP) {
      setStep((current) => Math.min(current + 1, STEPS.length));
      return;
    }

    if (step < SETUP_STEP_COUNT) {
      setStep((current) => current + 1);
    }
  }

  function renderFooter() {
    if (step === FINISH_STEP) {
      return (
        <div className="ml-auto flex flex-wrap items-center justify-end gap-3">
          {hasCalendarFile ? (
            <Button href="/calendar/review">Review calendar</Button>
          ) : (
            <Button href="/calendar/import">Import calendar</Button>
          )}
          <Button href="/dashboard" variant="secondary">
            Go to Today
          </Button>
        </div>
      );
    }

    if (canContinuePostSetup && step >= META_STEP) {
      return (
        <>
          <Button
            type="button"
            variant="ghost"
            onClick={() => setStep((current) => Math.max(META_STEP, current - 1))}
            disabled={step === META_STEP || isPending}
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div className="flex items-center gap-3">
            {step === META_STEP && (
              <Button
                type="button"
                variant="secondary"
                onClick={() => setStep(TEAM_STEP)}
              >
                Skip for now
              </Button>
            )}
            {step === TEAM_STEP && (
              <Button
                type="button"
                variant="secondary"
                onClick={() => setStep(FINISH_STEP)}
              >
                Skip for now
              </Button>
            )}
            <Button type="button" onClick={handleContinue}>
              Continue
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </>
      );
    }

    return (
      <>
        <Button
          type="button"
          variant="ghost"
          onClick={() => setStep((current) => Math.max(1, current - 1))}
          disabled={step === 1 || isPending}
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>

        {step < SETUP_STEP_COUNT ? (
          <Button type="button" onClick={handleContinue}>
            Continue
            <ArrowRight className="h-4 w-4" />
          </Button>
        ) : hasOrganization ? (
          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setStep(META_STEP)}
            >
              Skip for now
            </Button>
            <Button href="/calendar/import">Import calendar</Button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <Button type="submit" variant="secondary" disabled={isPending}>
              Skip calendar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Creating school..." : "Complete setup"}
            </Button>
          </div>
        )}
      </>
    );
  }

  const showSetupForm = step <= SETUP_STEP_COUNT;

  return (
    <div className="space-y-10">
      <WizardProgress steps={STEPS} currentStep={step} />

      {showSetupForm ? (
        <form action={formAction}>
          {validatedAccessCode && (
            <input
              type="hidden"
              name="foundingAccessCode"
              value={validatedAccessCode}
            />
          )}
          <WizardShell
            title={stepCopy.title}
            description={stepCopy.description}
            footer={renderFooter()}
          >
            {state.error && (step === 2 || step === 3) && (
              <div
                role="alert"
                className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
              >
                {state.error}
              </div>
            )}

            <div className={cn(step !== 1 && "hidden")}>
              <div className="mx-auto max-w-xl space-y-8 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center border border-cos-border bg-cos-bg">
                  <Sparkles className="h-8 w-8 text-cos-accent" strokeWidth={1.5} />
                </div>
                <div className="space-y-4 text-left">
                  <div className="border border-cos-border bg-cos-bg/40 px-5 py-4">
                    <p className="font-display text-xl text-cos-text">One school profile</p>
                    <p className="mt-1 text-sm leading-relaxed text-cos-muted">
                      Centralize your school details, timezone, and calendar in one
                      place. Brand logos and colors live in Get started → Build your
                      brand kit.
                    </p>
                  </div>
                  <div className="border border-cos-border bg-cos-bg/40 px-5 py-4">
                    <p className="font-display text-xl text-cos-text">Built for PTO volunteers</p>
                    <p className="mt-1 text-sm leading-relaxed text-cos-muted">
                      No marketing experience required. Just answer a few simple
                      questions.
                    </p>
                  </div>
                  <div className="border border-cos-border bg-cos-bg/40 px-5 py-4">
                    <p className="font-display text-xl text-cos-text">Ready for future features</p>
                    <p className="mt-1 text-sm leading-relaxed text-cos-muted">
                      Your setup becomes the foundation for events, campaigns, and
                      approvals.
                    </p>
                  </div>
                  {validatedAccessCode && (
                    <div className="border border-cos-success/30 bg-cos-success-bg/40 px-5 py-4">
                      <p className="text-sm font-medium text-cos-success-text">
                        Founding access code verified
                      </p>
                      <p className="mt-1 text-sm text-cos-muted">
                        Your partner code was validated at signup and will be
                        applied when you complete setup.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className={cn(step !== 2 && "hidden")}>
              <div className="mx-auto grid max-w-2xl gap-6">
                {schoolNameError && (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {schoolNameError}
                  </div>
                )}
                {timezoneError && (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {timezoneError}
                  </div>
                )}
                <Input
                  name="name"
                  label="School Name"
                  placeholder="Lincoln Elementary School"
                  required
                />
                <Select
                  name="timezone"
                  label="Organization timezone"
                  defaultValue={defaultTimezone}
                  required
                >
                  {COMMON_US_TIMEZONES.map((zone) => (
                    <option key={zone} value={zone}>
                      {zone.replace(/_/g, " ")}
                    </option>
                  ))}
                </Select>
                <p className="-mt-2 text-xs text-cos-muted">
                  Required for posting schedule heatmaps and suggested publish times.
                </p>
                <div className="grid gap-6 sm:grid-cols-2">
                  <Input
                    name="district"
                    label="District"
                    placeholder="Springfield School District"
                  />
                  <Input
                    name="schoolYear"
                    label="School Year"
                    placeholder="2025–2026"
                  />
                </div>
                <div className="grid gap-6 sm:grid-cols-2">
                  <Input
                    name="principal"
                    label="Principal"
                    placeholder="Dr. Jane Smith"
                  />
                  <Input name="mascot" label="Mascot" placeholder="Lions" />
                </div>
                <Input
                  name="schoolWebsite"
                  label="School Website"
                  placeholder="https://lincoln.springfield.edu"
                  type="url"
                />
                <Input
                  name="ptoWebsite"
                  label="PTO Website"
                  placeholder="https://lincolnpto.org"
                  type="url"
                />
              </div>
            </div>

            <div className={cn(step !== 3 && "hidden")}>
              <div className="mx-auto max-w-2xl space-y-6">
                {hasOrganization ? (
                  <>
                    <div className="space-y-3 rounded-xl border border-cos-border bg-cos-bg/40 px-5 py-5">
                      <p className="font-display text-xl text-cos-text">
                        Import calendar
                      </p>
                      <p className="text-sm leading-relaxed text-cos-muted">
                        Sign in with Google, link an ICS subscribe feed, or upload
                        a calendar file — one place, same review flow as Calendar
                        and Integrations.
                      </p>
                      <Button href="/calendar/import" className="mt-1">
                        Open Import calendar
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="border border-cos-border bg-cos-bg/40 px-5 py-4">
                      <p className="font-display text-xl text-cos-text">
                        Review before anything goes live
                      </p>
                      <p className="mt-1 text-sm leading-relaxed text-cos-muted">
                        New dates go to review first. Events start as view-only —
                        turn any one into a campaign later if you need it.
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="rounded-xl border border-cos-border bg-cos-bg/40 px-5 py-4">
                      <p className="text-sm font-medium text-cos-text">
                        Sign in with Google
                      </p>
                      <p className="mt-1 text-sm leading-relaxed text-cos-muted">
                        Available on Import calendar as soon as you finish setup —
                        alongside ICS and file upload, not a separate Integrations-only
                        path.
                      </p>
                    </div>
                    <Input
                      name="calendarSubscribeUrl"
                      label="Calendar subscribe feed (ICS URL)"
                      placeholder="https://calendar.google.com/calendar/ical/..."
                      hint="Optional — Google Calendar ICS or webcal:// URLs sync daily after setup."
                      type="url"
                    />
                    <FileUpload
                      name="calendarFile"
                      label="Or upload a calendar file"
                      accept=".pdf,.docx,.xlsx,.xls,.csv,.ics,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/calendar"
                      hint="PDF, Word (.docx), Excel, CSV, or ICS"
                      onChange={(file) => setHasCalendarFile(Boolean(file))}
                    />
                    <div className="border border-cos-border bg-cos-bg/40 px-5 py-4">
                      <p className="font-display text-xl text-cos-text">
                        Review before anything goes live
                      </p>
                      <p className="mt-1 text-sm leading-relaxed text-cos-muted">
                        After setup, you review every date in a list. Events start
                        as view-only on your calendar — turn any one into a campaign
                        later if you need it.
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>
          </WizardShell>
        </form>
      ) : (
        <WizardShell
          title={stepCopy.title}
          description={stepCopy.description}
          footer={renderFooter()}
        >
          {step === META_STEP && (
            <SchoolSetupMetaStep
              connection={metaConnection}
              configuredViaEnv={metaConfiguredViaEnv}
              integrationConfigured={metaIntegrationConfigured}
              oauthError={metaOauthError}
            />
          )}

          {step === TEAM_STEP && (
            <SchoolSetupTeamStep roles={organizationRoles} />
          )}

          {step === FINISH_STEP && (
            <div className="mx-auto flex max-w-lg flex-col items-center py-8 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50">
                <CheckCircle2 className="h-8 w-8 text-emerald-600" />
              </div>
              <p className="font-display mt-6 text-2xl text-cos-text">
                {hasOrganization && !state.success
                  ? "You're all set."
                  : "Your school has been created successfully."}
              </p>
              <p className="mt-3 text-sm text-cos-muted">
                {hasCalendarFile
                  ? "Redirecting you to review imported events..."
                  : "Next up: Import calendar (Google, ICS, or file) — or head to Today."}
              </p>
            </div>
          )}
        </WizardShell>
      )}
    </div>
  );
}
