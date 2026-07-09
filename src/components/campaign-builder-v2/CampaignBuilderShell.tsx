"use client";

import dynamic from "next/dynamic";
import { CampaignBuilderProvider, useCampaignBuilder } from "@/components/campaign-builder-v2/CampaignBuilderProvider";
import { CampaignBuilderStepper } from "@/components/campaign-builder-v2/CampaignBuilderStepper";
import { CampaignHealthGauge } from "@/components/campaign-builder-v2/CampaignHealthGauge";
import { InspirationStep } from "@/components/campaign-builder-v2/InspirationStep";
import type {
  BrandKitOption,
  CampaignBuilderSession,
  CampaignBuilderStepId,
  CampaignOption,
  PlaybookOption,
} from "@/lib/campaign-builder-v2/types";

const MilestonesStep = dynamic(
  () =>
    import("@/components/campaign-builder-v2/MilestonesStep").then((module) => ({
      default: module.MilestonesStep,
    })),
  { loading: () => <CampaignBuilderStepFallback /> },
);

const PreviewStep = dynamic(
  () =>
    import("@/components/campaign-builder-v2/PreviewStep").then((module) => ({
      default: module.PreviewStep,
    })),
  { loading: () => <CampaignBuilderStepFallback /> },
);

const ReviewStep = dynamic(
  () =>
    import("@/components/campaign-builder-v2/ReviewStep").then((module) => ({
      default: module.ReviewStep,
    })),
  { loading: () => <CampaignBuilderStepFallback /> },
);

const PublishedStep = dynamic(
  () =>
    import("@/components/campaign-builder-v2/PublishedStep").then((module) => ({
      default: module.PublishedStep,
    })),
  { loading: () => <CampaignBuilderStepFallback /> },
);

function CampaignBuilderStepFallback() {
  return (
    <div className="flex flex-1 items-center justify-center p-8">
      <div className="h-8 w-48 animate-pulse rounded-lg bg-cos-bg-alt" />
    </div>
  );
}

interface CampaignBuilderShellProps {
  eventId: string;
  eventTitle: string;
  eventDate: string;
  playbooks: PlaybookOption[];
  brandKits: BrandKitOption[];
  campaignOptions: CampaignOption[];
  initialSession: CampaignBuilderSession;
  restoredFromServer: boolean;
}

function renderActiveStep(step: CampaignBuilderStepId) {
  switch (step) {
    case "inspiration":
      return <InspirationStep />;
    case "milestones":
      return <MilestonesStep />;
    case "preview":
      return <PreviewStep />;
    case "review":
      return <ReviewStep />;
    case "published":
      return <PublishedStep />;
    default:
      return <InspirationStep />;
  }
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
        {renderActiveStep(currentStep)}
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
  initialSession,
  restoredFromServer,
}: CampaignBuilderShellProps) {
  return (
    <CampaignBuilderProvider
      eventId={eventId}
      eventTitle={eventTitle}
      eventDate={eventDate}
      playbooks={playbooks}
      brandKits={brandKits}
      campaignOptions={campaignOptions}
      initialSession={initialSession}
      restoredFromServer={restoredFromServer}
    >
      <CampaignBuilderContent />
    </CampaignBuilderProvider>
  );
}
