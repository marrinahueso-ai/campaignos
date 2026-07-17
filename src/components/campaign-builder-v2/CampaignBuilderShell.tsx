"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
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
import type { SetupLogoOption } from "@/lib/artwork-v2/setup-logos";
import type { CampaignBuilderSchoolColors } from "@/components/campaign-builder-v2/CampaignBuilderProvider";

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
  organizationId: string;
  canUseDeveloperTools?: boolean;
  canUploadArtwork?: boolean;
  playbooks: PlaybookOption[];
  brandKits: BrandKitOption[];
  campaignOptions: CampaignOption[];
  logoOptions: SetupLogoOption[];
  schoolColors: CampaignBuilderSchoolColors;
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

function CampaignBuilderContent({
  eventId,
  eventTitle,
}: {
  eventId: string;
  eventTitle: string;
}) {
  const {
    session,
    currentStep,
    healthPercent,
    stepperStates,
    stepWarnings,
    goToStep,
    navigateToWarning,
    isSaving,
  } = useCampaignBuilder();

  const headerTitle =
    session.inspiration.campaignName.trim() || eventTitle;

  return (
    <div className="-mx-4 -my-8 flex min-h-[calc(100vh-var(--cos-dashboard-header-height))] flex-col lg:-mx-8 lg:-my-10">
      <div className="flex items-center justify-between gap-4 border-b border-cos-border bg-cos-card px-4 py-4 lg:px-8">
        <div className="min-w-0 shrink-0">
          <Link
            href={`/events/${eventId}`}
            className="mb-2 inline-flex items-center gap-1.5 text-sm text-cos-muted transition-colors hover:text-cos-primary"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={1.5} />
            Back to event
          </Link>
          <p className="studio-eyebrow">Creative Studio</p>
          <p className="mt-1 text-sm text-cos-muted">
            Create with AI
            {isSaving ? " · Saving…" : ""}
          </p>
        </div>
        <div className="flex min-w-0 items-center gap-4 lg:gap-6">
          <h2
            className="font-display line-clamp-2 min-w-0 max-w-[10rem] text-right text-xl leading-tight text-cos-text sm:max-w-xs sm:text-2xl lg:max-w-md lg:text-3xl"
            title={headerTitle}
          >
            {headerTitle}
          </h2>
          <CampaignHealthGauge percent={healthPercent} className="shrink-0" />
        </div>
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
  organizationId,
  canUseDeveloperTools = false,
  canUploadArtwork = true,
  playbooks,
  brandKits,
  campaignOptions,
  logoOptions,
  schoolColors,
  initialSession,
  restoredFromServer,
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
      initialSession={initialSession}
      restoredFromServer={restoredFromServer}
    >
      <CampaignBuilderContent eventId={eventId} eventTitle={eventTitle} />
    </CampaignBuilderProvider>
  );
}
