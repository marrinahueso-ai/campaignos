"use client";

/**
 * @deprecated Prefer EditMilestoneModal (Artwork | Captions). Kept as a thin
 * wrapper so older call sites open the unified Edit sheet on the Captions tab.
 */
import { EditMilestoneModal } from "@/components/campaign-builder-v2/EditMilestoneModal";
import type {
  CampaignBuilderInspiration,
  CampaignBuilderMilestone,
  MilestoneArtwork,
  MilestonePreviewContent,
} from "@/lib/campaign-builder-v2/types";

interface EditCaptionModalProps {
  eventId: string;
  milestoneId: string;
  inspiration: CampaignBuilderInspiration;
  milestone: CampaignBuilderMilestone;
  currentCaption: string;
  captionNotes?: string;
  voiceTone: string;
  playbookName?: string | null;
  artworkImageUrl?: string | null;
  /** Preferred — when omitted, artwork regenerate is unavailable. */
  brandKitId?: string | null;
  previewContent?: MilestonePreviewContent;
  milestones?: CampaignBuilderMilestone[];
  artworkNotes?: string;
  onClose: () => void;
  onApply: (text: string, options?: { close?: boolean }) => void;
  onApplyArtwork?: (artwork: MilestoneArtwork) => void;
}

export function EditCaptionModal({
  eventId,
  milestoneId,
  inspiration,
  milestone,
  currentCaption,
  captionNotes,
  voiceTone,
  playbookName,
  artworkImageUrl,
  brandKitId = null,
  previewContent,
  milestones = [],
  artworkNotes,
  onClose,
  onApply,
  onApplyArtwork,
}: EditCaptionModalProps) {
  const content: MilestonePreviewContent =
    previewContent ??
    ({
      milestoneId,
      status: "draft",
      artwork: {
        feedUrl: artworkImageUrl ?? null,
        storyUrl: null,
      },
      captions: [
        { platform: "facebook", text: currentCaption },
        { platform: "instagram", text: currentCaption },
      ],
      enabledFormats: milestone.platformFormats,
      deliveryMethod: "draft-only",
      scheduleDate: "",
      scheduleTime: "",
      emailSendDate: "",
      emailSendTime: "",
      manualEmailTo: "",
      manualUploadLink: "",
      approvalStatuses: [],
    } satisfies MilestonePreviewContent);

  return (
    <EditMilestoneModal
      eventId={eventId}
      milestoneId={milestoneId}
      brandKitId={brandKitId}
      inspiration={inspiration}
      milestone={milestone}
      previewContent={content}
      milestones={milestones.length > 0 ? milestones : [milestone]}
      currentCaption={currentCaption}
      artworkNotes={artworkNotes}
      captionNotes={captionNotes}
      voiceTone={voiceTone}
      playbookName={playbookName}
      artworkImageUrl={artworkImageUrl}
      initialTab="captions"
      onClose={onClose}
      onApplyArtwork={onApplyArtwork ?? (() => undefined)}
      onApplyCaption={onApply}
    />
  );
}
