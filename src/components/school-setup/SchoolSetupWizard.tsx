"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useActionState, useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, CheckCircle2, Sparkles } from "lucide-react";
import { SchoolSetupMetaStep } from "@/components/school-setup/SchoolSetupMetaStep";
import { SchoolSetupTeamStep } from "@/components/school-setup/SchoolSetupTeamStep";
import { WizardProgress } from "@/components/school-setup/WizardProgress";
import { WizardShell } from "@/components/school-setup/WizardShell";
import { Button } from "@/components/ui/Button";
import { ColorField } from "@/components/ui/ColorField";
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
  "Brand",
  "Calendar",
  "Meta",
  "Team",
  "Finish",
];

const SETUP_STEP_COUNT = 4;
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
  metaConnection?: MetaConnection | null;
  metaConfiguredViaEnv?: boolean;
  metaIntegrationConfigured?: boolean;
  metaOauthError?: string | null;
  organizationRoles?: OrganizationRole[];
}

export function SchoolSetupWizard({
  validatedAccessCode = null,
  resumePostSetup = false,
  metaConnection = null,
  metaConfiguredViaEnv = false,
  metaIntegrationConfigured = false,
  metaOauthError = null,
  organizationRoles = [],
}: SchoolSetupWizardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [step, setStep] = useState(resumePostSetup ? 5 : 1);
  const [hasCalendarFile, setHasCalendarFile] = useState(false);
  const [schoolNameError, setSchoolNameError] = useState<string | null>(null);
  const [timezoneError, setTimezoneError] = useState<string | null>(null);
  const [defaultTimezone] = useState(detectDefaultTimezone);
  const [state, formAction, isPending] = useActionState(
    completeSchoolSetup,
    initialState,
  );

  const setupComplete = state.success || resumePostSetup;

  useEffect(() => {
    if (searchParams.get("step") === "meta") {
      setStep(5);
    }
  }, [searchParams]);

  useEffect(() => {
    if (resumePostSetup && searchParams.get("step") !== "meta") {
      setStep(5);
    }
  }, [resumePostSetup, searchParams]);

  useEffect(() => {
    if (state.success && step <= SETUP_STEP_COUNT) {
      setStep(5);
      router.replace("/settings/school-setup?onboarding=1");
      router.refresh();
    }
  }, [state.success, step, router]);

  useEffect(() => {
    if (step === 7 && setupComplete) {
      const destination = hasCalendarFile ? "/calendar/review" : "/dashboard";
      const timeout = setTimeout(() => {
        router.push(destination);
      }, 2500);

      return () => clearTimeout(timeout);
    }
  }, [step, setupComplete, hasCalendarFile, router]);

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
          title: "Build your brand kit",
          description:
            "Upload logos and choose colors so every future campaign feels like your PTO. Skip if you want to add these later.",
        },
        4: {
          title: "Import your school calendar",
          description:
            "Upload a calendar file or paste an ICS subscribe feed. We will read the dates and let you review them before they go live.",
        },
        5: {
          title: "Connect Facebook & Instagram",
          description:
            "Optional — link Meta now for automatic publishing after approvals, or connect anytime in Settings.",
        },
        6: {
          title: "Invite your board",
          description:
            "Add VPs and committee chairs by email. Invites are optional — you can always invite later from Settings → Team.",
        },
        7: {
          title: "You're all set",
          description: "Your school profile is ready. Let's head to your dashboard.",
        },
      })[step as 1 | 2 | 3 | 4 | 5 | 6 | 7] ?? {
        title: "Welcome to Hey Ralli",
        description:
          "Set up your school profile once, and every PTO communication will stay on brand all year long.",
      },
    [step],
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

    if (setupComplete && step >= 5) {
      setStep((current) => Math.min(current + 1, STEPS.length));
      return;
    }

    if (step < SETUP_STEP_COUNT) {
      setStep((current) => current + 1);
    }
  }

  function renderFooter() {
    if (step === 7) {
      return (
        <div className="ml-auto">
          <Button href={hasCalendarFile ? "/calendar/review" : "/dashboard"}>
            {hasCalendarFile ? "Review Calendar" : "Go to Today"}
          </Button>
        </div>
      );
    }

    if (setupComplete && step >= 5) {
      return (
        <>
          <Button
            type="button"
            variant="ghost"
            onClick={() => setStep((current) => Math.max(5, current - 1))}
            disabled={step === 5 || isPending}
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div className="flex items-center gap-3">
            {step === 5 && (
              <Button type="button" variant="secondary" onClick={() => setStep(6)}>
                Skip for now
              </Button>
            )}
            {step === 6 && (
              <Button type="button" variant="secondary" onClick={() => setStep(7)}>
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
            {state.error && (step === 2 || step === 4) && (
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
                      Centralize your school details, branding, timezone, and calendar in
                      one place.
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
              <div className="mx-auto grid max-w-2xl gap-8">
                <div className="grid gap-6 sm:grid-cols-2">
                  <FileUpload
                    name="ptoLogo"
                    label="PTO Logo"
                    accept="image/png,image/jpeg,image/svg+xml,image/webp"
                  />
                  <FileUpload
                    name="schoolLogo"
                    label="School Logo"
                    accept="image/png,image/jpeg,image/svg+xml,image/webp"
                  />
                </div>
                <div className="grid gap-6 sm:grid-cols-2">
                  <ColorField
                    name="primaryColor"
                    label="Primary Color"
                    defaultValue="#4F46E5"
                  />
                  <ColorField
                    name="secondaryColor"
                    label="Secondary Color"
                    defaultValue="#0F172A"
                  />
                </div>
                <Select name="fontFamily" label="Font (optional)" defaultValue="">
                  <option value="">Default system font</option>
                  <option value="Inter">Inter</option>
                  <option value="Geist">Geist</option>
                  <option value="Arial">Arial</option>
                  <option value="Georgia">Georgia</option>
                </Select>
              </div>
            </div>

            <div className={cn(step !== 4 && "hidden")}>
              <div className="mx-auto max-w-2xl space-y-6">
                <FileUpload
                  name="calendarFile"
                  label="School calendar file"
                  accept=".pdf,.docx,.xlsx,.xls,.csv,.ics,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/calendar"
                  hint="PDF, Word (.docx), Excel, CSV, or ICS"
                  onChange={(file) => setHasCalendarFile(Boolean(file))}
                />
                <Input
                  name="calendarSubscribeUrl"
                  label="Calendar subscribe feed (ICS URL)"
                  placeholder="https://calendar.google.com/calendar/ical/..."
                  hint="Optional — Google Calendar ICS or webcal:// URLs sync daily after setup."
                  type="url"
                />
                <div className="border border-cos-border bg-cos-bg/40 px-5 py-4">
                  <p className="font-display text-xl text-cos-text">
                    Review before anything goes live
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-cos-muted">
                    After setup, you will review every date in a list. Events start
                    as view-only on your calendar — turn any one into a campaign
                    later if you need it.
                  </p>
                </div>
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
          {step === 5 && (
            <SchoolSetupMetaStep
              connection={metaConnection}
              configuredViaEnv={metaConfiguredViaEnv}
              integrationConfigured={metaIntegrationConfigured}
              oauthError={metaOauthError}
            />
          )}

          {step === 6 && <SchoolSetupTeamStep roles={organizationRoles} />}

          {step === 7 && (
            <div className="mx-auto flex max-w-lg flex-col items-center py-8 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50">
                <CheckCircle2 className="h-8 w-8 text-emerald-600" />
              </div>
              <p className="font-display mt-6 text-2xl text-cos-text">
                Your school has been created successfully.
              </p>
              <p className="mt-3 text-sm text-cos-muted">
                {hasCalendarFile
                  ? "Redirecting you to review imported events..."
                  : "Redirecting you to the dashboard..."}
              </p>
            </div>
          )}
        </WizardShell>
      )}
    </div>
  );
}
