"use client";

import { CampaignBuilderProvider, useCampaignBuilder } from "@/components/campaign-builder-v2/CampaignBuilderProvider";
import { CampaignBuilderStepper } from "@/components/campaign-builder-v2/CampaignBuilderStepper";
import { CampaignHealthGauge } from "@/components/campaign-builder-v2/CampaignHealthGauge";
import { InspirationStep } from "@/components/campaign-builder-v2/InspirationStep";
import { MilestonesStep } from "@/components/campaign-builder-v2/MilestonesStep";
import { PreviewStep } from "@/components/campaign-builder-v2/PreviewStep";
import { PublishedStep } from "@/components/campaign-builder-v2/PublishedStep";
import { ReviewStep } from "@/components/campaign-builder-v2/ReviewStep";
import type {
  BrandKitOption,
  CampaignBuilderStepId,
  CampaignOption,
  PlaybookOption,
} from "@/lib/campaign-builder-v2/types";

interface CampaignBuilderShellProps {
  eventId: string;
  eventTitle: string;
  eventDate: string;
  playbooks: PlaybookOption[];
  brandKits: BrandKitOption[];
  campaignOptions: CampaignOption[];
}

function CampaignBuilderContent() {
  const {
    currentStep,
    healthPercent,
    stepperStates,
    stepWarnings,
    goToStep,
    navigateToWarning,
    isSaving,
  } = useCampaignBuilder();

  const steps: Record<CampaignBuilderStepId, React.ReactNode> = {
    inspiration: <InspirationStep />,
    milestones: <MilestonesStep />,
    preview: <PreviewStep />,
    review: <ReviewStep />,
    published: <PublishedStep />,
  };

  return (
    <div className="-mx-4 -my-8 flex min-h-[calc(100vh-var(--cos-dashboard-header-height))] flex-col lg:-mx-8 lg:-my-10">
      <div className="flex items-center justify-between border-b border-cos-border bg-cos-card px-4 py-4 lg:px-8">
        <div>
          <p className="studio-eyebrow">Creative Studio</p>
          <p className="mt-1 text-sm text-cos-muted">
            Create with AI
            {isSaving ? " · Saving…" : ""}
          </p>
        </div>
        <CampaignHealthGauge percent={healthPercent} />
      </div>

      <CampaignBuilderStepper
        currentStep={currentStep}
        stepStates={stepperStates}
        warnings={stepWarnings}
        onStepClick={goToStep}
        onWarningClick={navigateToWarning}
      />

      <div className="flex min-h-0 flex-1 flex-col bg-cos-bg">
        {steps[currentStep]}
      </div>
    </div>
  );
}

export function CampaignBuilderShell({
  eventId,
  eventTitle,
  eventDate,
  playbooks,
  brandKits,
  campaignOptions,
}: CampaignBuilderShellProps) {
  return (
    <CampaignBuilderProvider
      eventId={eventId}
      eventTitle={eventTitle}
      eventDate={eventDate}
      playbooks={playbooks}
      brandKits={brandKits}
      campaignOptions={campaignOptions}
    >
      <CampaignBuilderContent />
    </CampaignBuilderProvider>
  );
}
