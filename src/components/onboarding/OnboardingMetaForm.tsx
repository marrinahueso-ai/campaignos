"use client";

import { useTransition } from "react";
import {
  finishOnboardingPromptsAction,
  skipOnboardingPromptAction,
} from "@/lib/onboarding/actions";
import { OnboardingProgress } from "@/components/onboarding/OnboardingProgress";
import { MetaConnectionPanel } from "@/components/meta-publishing/MetaConnectionPanel";
import { Button } from "@/components/ui/Button";
import {
  isInstagramPublishingConfigured,
  isMetaConnectionConfigured,
} from "@/lib/meta-publishing/connection-utils";
import type { MetaConnection } from "@/lib/meta-publishing/types";

interface OnboardingMetaFormProps {
  connection: MetaConnection | null;
  configuredViaEnv: boolean;
  integrationConfigured: boolean;
  oauthError?: string | null;
  firstEventId?: string | null;
}

export function OnboardingMetaForm({
  connection,
  configuredViaEnv,
  integrationConfigured,
  oauthError = null,
  firstEventId = null,
}: OnboardingMetaFormProps) {
  const [isPending, startTransition] = useTransition();
  const connected = isMetaConnectionConfigured(connection);
  const hasInstagram = isInstagramPublishingConfigured(connection);
  const returnTo = firstEventId
    ? `/events/${firstEventId}`
    : "/dashboard";

  return (
    <div className="mx-auto max-w-lg space-y-8 px-4 py-10">
      <OnboardingProgress current="meta" />
      <div>
        <h1 className="font-display text-3xl text-cos-text sm:text-4xl">
          Connect Facebook &amp; Instagram
        </h1>
        <p className="mt-2 text-sm text-cos-muted">
          Optional — link your PTO page so approved posts can publish
          automatically. You can always connect later from home or Settings →
          Integrations.
        </p>
        {connected ? (
          <p className="mt-3 text-sm font-medium text-emerald-700">
            {hasInstagram
              ? "Facebook and Instagram are connected."
              : "Facebook is connected."}
          </p>
        ) : null}
      </div>

      <MetaConnectionPanel
        connection={connection}
        configuredViaEnv={configuredViaEnv}
        integrationConfigured={integrationConfigured}
        returnTo={returnTo}
        oauthError={oauthError}
      />

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="secondary"
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              await skipOnboardingPromptAction("meta");
            })
          }
        >
          Do this later
        </Button>
        <Button
          type="button"
          variant="ghost"
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              await finishOnboardingPromptsAction();
            })
          }
        >
          Go to home
        </Button>
      </div>
    </div>
  );
}
