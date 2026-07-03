"use client";

import { MetaConnectionPanel } from "@/components/meta-publishing/MetaConnectionPanel";
import {
  isInstagramPublishingConfigured,
  isMetaConnectionConfigured,
} from "@/lib/meta-publishing/connection-utils";
import type { MetaConnection } from "@/lib/meta-publishing/types";

interface SchoolSetupMetaStepProps {
  connection: MetaConnection | null;
  configuredViaEnv: boolean;
  integrationConfigured: boolean;
  oauthError?: string | null;
}

export function SchoolSetupMetaStep({
  connection,
  configuredViaEnv,
  integrationConfigured,
  oauthError = null,
}: SchoolSetupMetaStepProps) {
  const connected = isMetaConnectionConfigured(connection);
  const hasInstagram = isInstagramPublishingConfigured(connection);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="border border-cos-border bg-cos-bg/40 px-5 py-4">
        <p className="font-display text-xl text-cos-text">
          Connect Facebook &amp; Instagram
        </p>
        <p className="mt-1 text-sm leading-relaxed text-cos-muted">
          Optional — link your PTO page now so approved posts can publish
          automatically. You can always connect later in Settings → Meta.
        </p>
        {connected && (
          <p className="mt-3 text-sm font-medium text-emerald-700">
            {hasInstagram
              ? "Facebook and Instagram are connected."
              : "Facebook is connected."}
          </p>
        )}
      </div>

      <MetaConnectionPanel
        connection={connection}
        configuredViaEnv={configuredViaEnv}
        integrationConfigured={integrationConfigured}
        returnTo="/settings/school-setup?onboarding=1&step=meta"
        oauthError={oauthError}
      />
    </div>
  );
}
