"use client";

import { useState, useTransition } from "react";
import {
  saveOnboardingBrandAction,
  skipOnboardingPromptAction,
} from "@/lib/onboarding/actions";
import { OnboardingProgress } from "@/components/onboarding/OnboardingProgress";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

interface OnboardingBrandFormProps {
  initialPrimary: string;
  initialSecondary: string;
  initialMascot: string;
}

export function OnboardingBrandForm({
  initialPrimary,
  initialSecondary,
  initialMascot,
}: OnboardingBrandFormProps) {
  const [primaryColor, setPrimaryColor] = useState(initialPrimary);
  const [secondaryColor, setSecondaryColor] = useState(initialSecondary);
  const [mascot, setMascot] = useState(initialMascot);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="mx-auto max-w-2xl space-y-8 px-4 py-10">
      <OnboardingProgress current="brand" />
      <div>
        <h1 className="font-display text-3xl text-cos-text sm:text-4xl">
          Brand your school
        </h1>
        <p className="mt-2 text-sm text-cos-muted">
          Logo, colors, and mascot — skip anytime and come back from Today.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <form
          className="space-y-4"
          action={(formData) => {
            startTransition(async () => {
              setError(null);
              const result = await saveOnboardingBrandAction(formData);
              if (result?.error) {
                setError(result.error);
              }
            });
          }}
        >
          <div>
            <label className="mb-1.5 block text-sm font-medium" htmlFor="ptoLogo">
              PTO logo
            </label>
            <Input id="ptoLogo" name="ptoLogo" type="file" accept="image/*" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                className="mb-1.5 block text-sm font-medium"
                htmlFor="primaryColor"
              >
                Primary
              </label>
              <Input
                id="primaryColor"
                name="primaryColor"
                type="color"
                value={primaryColor}
                onChange={(event) => setPrimaryColor(event.target.value)}
              />
            </div>
            <div>
              <label
                className="mb-1.5 block text-sm font-medium"
                htmlFor="secondaryColor"
              >
                Accent
              </label>
              <Input
                id="secondaryColor"
                name="secondaryColor"
                type="color"
                value={secondaryColor}
                onChange={(event) => setSecondaryColor(event.target.value)}
              />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium" htmlFor="mascot">
              Mascot
            </label>
            <Input
              id="mascot"
              name="mascot"
              value={mascot}
              onChange={(event) => setMascot(event.target.value)}
              placeholder="e.g. Eagles"
            />
          </div>
          {error ? (
            <p className="text-sm text-red-700" role="alert">
              {error}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving…" : "Save"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={isPending}
              onClick={() =>
                startTransition(async () => {
                  await skipOnboardingPromptAction("brand");
                })
              }
            >
              Skip for now
            </Button>
          </div>
        </form>

        <div
          className="overflow-hidden rounded-2xl border border-cos-border p-6"
          style={{
            background: `linear-gradient(145deg, ${primaryColor} 0%, ${secondaryColor} 100%)`,
          }}
        >
          <div className="rounded-xl bg-white/95 p-5 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-cos-muted">
              Live preview
            </p>
            <p className="font-display mt-2 text-2xl text-cos-text">
              {mascot.trim() || "Your mascot"}
            </p>
            <p className="mt-2 text-sm text-cos-muted">
              Campaign artwork and posts will pick up these colors.
            </p>
            <div className="mt-4 flex gap-2">
              <span
                className="h-8 w-8 rounded-full border border-cos-border"
                style={{ backgroundColor: primaryColor }}
              />
              <span
                className="h-8 w-8 rounded-full border border-cos-border"
                style={{ backgroundColor: secondaryColor }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
