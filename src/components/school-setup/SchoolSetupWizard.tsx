"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, CheckCircle2, Sparkles } from "lucide-react";
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
import { cn } from "@/lib/utils/cn";

const STEPS = ["Welcome", "School", "Brand", "Calendar", "Finish"];
const initialState: SchoolSetupFormState = { error: null, success: false };

interface SchoolSetupWizardProps {
  accessCodeRequired?: boolean;
}

export function SchoolSetupWizard({
  accessCodeRequired = false,
}: SchoolSetupWizardProps) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [hasCalendarFile, setHasCalendarFile] = useState(false);
  const [schoolNameError, setSchoolNameError] = useState<string | null>(null);
  const [state, formAction, isPending] = useActionState(
    completeSchoolSetup,
    initialState,
  );

  useEffect(() => {
    if (state.success) {
      setStep(5);
    }
  }, [state.success]);

  useEffect(() => {
    if (step === 5 && state.success) {
      const destination = hasCalendarFile ? "/calendar/review" : "/dashboard";
      const timeout = setTimeout(() => {
        router.push(destination);
      }, 2500);

      return () => clearTimeout(timeout);
    }
  }, [step, state.success, hasCalendarFile, router]);

  const stepCopy = {
    1: {
      title: "Welcome to CampaignOS",
      description:
        "Set up your school profile once, and every PTO communication will stay on brand all year long.",
    },
    2: {
      title: "Tell us about your school",
      description:
        "This information helps CampaignOS keep your communications accurate and community-focused.",
    },
    3: {
      title: "Build your brand kit",
      description:
        "Upload logos and choose colors so every future campaign feels like your PTO.",
    },
    4: {
      title: "Upload your school calendar",
      description:
        "Add your calendar PDF now. We will read the dates and let you review them before they appear on your calendar.",
    },
    5: {
      title: "You're all set",
      description: "Your school profile is ready. Let's head to your dashboard.",
    },
  }[step as 1 | 2 | 3 | 4 | 5];

  return (
    <div className="space-y-10">
      <WizardProgress steps={STEPS} currentStep={step} />

      <form action={formAction}>
        <WizardShell
          title={stepCopy.title}
          description={stepCopy.description}
          footer={
            step === 5 ? (
              <div className="ml-auto">
                <Button href={hasCalendarFile ? "/calendar/review" : "/dashboard"}>
                  {hasCalendarFile ? "Review Calendar" : "Go to Today"}
                </Button>
              </div>
            ) : (
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

                {step < 4 ? (
                  <Button
                    type="button"
                    onClick={() => {
                      if (step === 2) {
                        const nameInput = document.querySelector<HTMLInputElement>(
                          'input[name="name"]',
                        );
                        if (!nameInput?.value.trim()) {
                          setSchoolNameError("School name is required.");
                          return;
                        }
                        setSchoolNameError(null);
                      }
                      setStep((current) => current + 1);
                    }}
                  >
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
            )
          }
        >
          {state.error && (step === 1 || step === 4) && (
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
                    Centralize your school details, branding, and calendar in
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
                <div className="border border-cos-border bg-cos-bg/40 px-5 py-4">
                  <Input
                    name="foundingAccessCode"
                    label={
                      accessCodeRequired
                        ? "Founding access code"
                        : "Founding access code (optional)"
                    }
                    placeholder="Enter your partner code"
                    autoComplete="off"
                    required={accessCodeRequired}
                  />
                  <p className="mt-2 text-sm leading-relaxed text-cos-muted">
                    {accessCodeRequired
                      ? "A valid founding code is required to create your workspace."
                      : "Have an early partner code? Enter it here to unlock founding benefits and skip future billing."}
                  </p>
                </div>
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
              <Input
                name="name"
                label="School Name"
                placeholder="Lincoln Elementary School"
                required
              />
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
                label="School Calendar"
                accept=".pdf,.docx,.xlsx,.xls,.csv,.ics,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/calendar"
                hint="PDF, Word (.docx), Excel, CSV, or ICS"
                onChange={(file) => setHasCalendarFile(Boolean(file))}
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

          <div className={cn(step !== 5 && "hidden")}>
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
          </div>
        </WizardShell>
      </form>
    </div>
  );
}
