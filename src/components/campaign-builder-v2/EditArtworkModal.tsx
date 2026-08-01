"use client";

/**
 * @deprecated Prefer EditMilestoneModal (Artwork | Captions). Kept as a thin
 * wrapper so older call sites open the unified Edit sheet on the Artwork tab.
 */
import {
  EditMilestoneModal,
  type EditMilestoneTab,
} from "@/components/campaign-builder-v2/EditMilestoneModal";
import type {
  CampaignBuilderInspiration,
  CampaignBuilderMilestone,
  MilestoneArtwork,
  MilestoneGenerationStatus,
  MilestonePreviewContent,
} from "@/lib/campaign-builder-v2/types";

interface EditArtworkModalProps {
  eventId: string;
  milestoneId: string;
  brandKitId: string | null;
  inspiration: CampaignBuilderInspiration;
  milestone: CampaignBuilderMilestone;
  previewContent: MilestonePreviewContent;
  milestones: CampaignBuilderMilestone[];
  artworkNotes?: string;
  generationStatus?: MilestoneGenerationStatus;
  currentCaption?: string;
  captionNotes?: string;
  voiceTone?: string;
  playbookName?: string | null;
  artworkImageUrl?: string | null;
  initialTab?: EditMilestoneTab;
  onClose: () => void;
  onApply: (artwork: MilestoneArtwork) => void;
  onApplyCaption?: (text: string, options?: { close?: boolean }) => void;
  onResendForApproval?: (artwork: MilestoneArtwork) => Promise<void>;
}

export function EditArtworkModal({
  eventId,
  milestoneId,
  brandKitId,
  inspiration,
  milestone,
  previewContent,
  milestones,
  artworkNotes,
  generationStatus,
  currentCaption = "",
  captionNotes,
  voiceTone = "",
  playbookName,
  artworkImageUrl,
  initialTab = "artwork",
  onClose,
  onApply,
  onApplyCaption,
  onResendForApproval,
}: EditArtworkModalProps) {
  return (
    <EditMilestoneModal
      eventId={eventId}
      milestoneId={milestoneId}
      brandKitId={brandKitId}
      inspiration={inspiration}
      milestone={milestone}
      previewContent={previewContent}
      milestones={milestones}
      currentCaption={currentCaption}
      artworkNotes={artworkNotes}
      captionNotes={captionNotes}
      voiceTone={voiceTone}
      playbookName={playbookName}
      artworkImageUrl={artworkImageUrl}
      generationStatus={generationStatus}
      initialTab={initialTab}
      onClose={onClose}
      onApplyArtwork={onApply}
      onApplyCaption={onApplyCaption ?? (() => undefined)}
      onResendForApproval={onResendForApproval}
    />
  );
}
