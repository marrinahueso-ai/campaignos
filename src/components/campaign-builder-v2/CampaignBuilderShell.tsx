"use client";

import { CampaignBuilderProvider } from "@/components/campaign-builder-v2/CampaignBuilderProvider";
import { SocialMediaComposer } from "@/components/campaign-builder-v2/social-composer";
import type { ResolvedWorkflowApprover } from "@/lib/campaign-builder-v2/approval-workflow";
import type {
  BrandKitOption,
  CampaignBuilderSession,
  CampaignOption,
  PlaybookOption,
} from "@/lib/campaign-builder-v2/types";
import type { SetupLogoOption } from "@/lib/artwork-v2/setup-logos";
import type { CampaignBuilderSchoolColors } from "@/components/campaign-builder-v2/CampaignBuilderProvider";

interface CampaignBuilderShellProps {
  eventId: string;
  eventTitle: string;
  eventDate: string;
  organizationId: string;
  canUseDeveloperTools?: boolean;
  canUploadArtwork?: boolean;
  playbooks: PlaybookOption[];
  brandKits: BrandKitOption[];
  campaignOptions: CampaignOption[];
  logoOptions: SetupLogoOption[];
  schoolColors: CampaignBuilderSchoolColors;
  mascot?: string | null;
  initialSession: CampaignBuilderSession;
  restoredFromServer: boolean;
  resolvedWorkflowApprover?: ResolvedWorkflowApprover | null;
  /** True when Team Access has a distinct approver (not self / unassigned). */
  hasExternalReviewer?: boolean;
}

function CampaignBuilderContent({
  eventId,
  eventTitle,
}: {
  eventId: string;
  eventTitle: string;
}) {
  return <SocialMediaComposer eventId={eventId} eventTitle={eventTitle} />;
}

export function CampaignBuilderShell({
  eventId,
  eventTitle,
  eventDate,
  organizationId,
  canUseDeveloperTools = false,
  canUploadArtwork = true,
  playbooks,
  brandKits,
  campaignOptions,
  logoOptions,
  schoolColors,
  mascot = null,
  initialSession,
  restoredFromServer,
  resolvedWorkflowApprover = null,
  hasExternalReviewer = false,
}: CampaignBuilderShellProps) {
  return (
    <CampaignBuilderProvider
      key={eventId}
      eventId={eventId}
      eventTitle={eventTitle}
      eventDate={eventDate}
      organizationId={organizationId}
      canUseDeveloperTools={canUseDeveloperTools}
      canUploadArtwork={canUploadArtwork}
      playbooks={playbooks}
      brandKits={brandKits}
      campaignOptions={campaignOptions}
      logoOptions={logoOptions}
      schoolColors={schoolColors}
      mascot={mascot}
      initialSession={initialSession}
      restoredFromServer={restoredFromServer}
      resolvedWorkflowApprover={resolvedWorkflowApprover}
      hasExternalReviewer={hasExternalReviewer}
    >
      <CampaignBuilderContent eventId={eventId} eventTitle={eventTitle} />
    </CampaignBuilderProvider>
  );
}
