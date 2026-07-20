"use client";

import { useEffect, useState, useTransition } from "react";
import { ClearGeneratedContentModal } from "@/components/dev-tools/ClearGeneratedContentModal";
import { SettingsV2Card } from "@/components/settings-v2/SettingsV2Card";
import { Button } from "@/components/ui/Button";
import {
  clearCampaignGeneratedContentAction,
  canUseDeveloperClearToolsAction,
} from "@/lib/dev-tools/actions";
import { clearLocalGeneratedContent } from "@/lib/dev-tools/clear-local-generated-content";
import { CLEAR_CONFIRMATION_COPY } from "@/lib/dev-tools/constants";

interface CampaignOption {
  id: string;
  title: string;
}

interface DeveloperClearCampaignPanelProps {
  organizationId: string;
  campaigns: CampaignOption[];
}

export function DeveloperClearCampaignPanel({
  organizationId,
  campaigns,
}: DeveloperClearCampaignPanelProps) {
  const [allowed, setAllowed] = useState(false);
  const [eventId, setEventId] = useState(campaigns[0]?.id ?? "");
  const [modalOpen, setModalOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    void canUseDeveloperClearToolsAction().then(setAllowed);
  }, []);

  if (!allowed) {
    return null;
  }

  return (
    <>
      <SettingsV2Card
        title="Developer tools"
        description="Owner/Admin testing helpers. Clears generated artwork and captions only."
      >
        <p className="text-sm text-cos-muted">{CLEAR_CONFIRMATION_COPY}</p>

        <label className="mt-4 block text-sm text-cos-text">
          Campaign
          <select
            className="mt-1 w-full border border-cos-border bg-cos-bg px-3 py-2 text-sm"
            value={eventId}
            onChange={(event) => setEventId(event.target.value)}
          >
            {campaigns.length === 0 ? (
              <option value="">No campaigns</option>
            ) : (
              campaigns.map((campaign) => (
                <option key={campaign.id} value={campaign.id}>
                  {campaign.title}
                </option>
              ))
            )}
          </select>
        </label>

        <Button
          className="mt-4"
          variant="danger"
          disabled={!eventId || isPending}
          onClick={() => {
            setError(null);
            setMessage(null);
            setModalOpen(true);
          }}
        >
          Clear Campaign Artwork & Captions
        </Button>

        {message ? (
          <p className="mt-3 text-sm font-medium text-cos-success-text">
            {message}
          </p>
        ) : null}
        {error ? (
          <p className="mt-3 text-sm text-cos-warning-text" role="alert">
            {error}
          </p>
        ) : null}
      </SettingsV2Card>

      <ClearGeneratedContentModal
        open={modalOpen}
        title="Clear Campaign Artwork & Captions"
        requireClearToken
        isSubmitting={isPending}
        errorMessage={error}
        onClose={() => setModalOpen(false)}
        onConfirm={(confirmToken) => {
          startTransition(async () => {
            setError(null);
            const result = await clearCampaignGeneratedContentAction({
              organizationId,
              eventId,
              confirmToken,
            });
            if (!result.success) {
              setError(result.message);
              return;
            }
            clearLocalGeneratedContent(eventId, "all");
            setMessage(
              `Cleared ${result.artworkCleared} artwork reference(s) and ${result.captionsCleared} caption(s).`,
            );
            setModalOpen(false);
          });
        }}
      />
    </>
  );
}
