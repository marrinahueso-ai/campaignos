"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { CampaignBuilderModal } from "@/components/campaign-builder-v2/CampaignBuilderModal";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { regenerateCaptionAction } from "@/lib/campaign-builder-v2/actions";
import type {
  CampaignBuilderInspiration,
  CampaignBuilderMilestone,
} from "@/lib/campaign-builder-v2/types";

const QUICK_SUGGESTIONS = [
  "Shorter",
  "More excited",
  "Add emoji",
  "Include CTA",
  "Warmer tone",
  "Add date",
];

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
  onClose: () => void;
  onApply: (text: string) => void;
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
  onClose,
  onApply,
}: EditCaptionModalProps) {
  const [instructions, setInstructions] = useState(captionNotes ?? "");
  const [tone, setTone] = useState(voiceTone);
  const [previewCaption, setPreviewCaption] = useState(currentCaption);
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleRegenerate() {
    setIsGenerating(true);
    setErrorMessage(null);
    try {
      const result = await regenerateCaptionAction({
        eventId,
        milestoneId,
        platform: milestone.platforms[0] ?? "facebook",
        instructions,
        tone,
        currentCaption,
        inspiration,
        milestone,
        artworkImageUrl,
        playbookName: playbookName ?? null,
      });
      if (result.success) {
        setPreviewCaption(result.caption);
      } else {
        setErrorMessage(result.message);
      }
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <CampaignBuilderModal
      title="Edit caption"
      subtitle="Caption for Facebook and Instagram"
      onClose={onClose}
      size="lg"
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => onApply(previewCaption)}>
            Apply caption
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        <div className="grid gap-4 lg:grid-cols-2">
          <Textarea
            label="Current caption"
            value={currentCaption}
            readOnly
            rows={5}
            className="bg-cos-bg/50"
          />
          <Textarea
            label="Add instructions for AI"
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            rows={5}
            placeholder="e.g. Make it shorter and more excited..."
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Select
            label="Tone"
            value={tone}
            onChange={(e) => setTone(e.target.value)}
          >
            <option value={voiceTone || "Campaign default"}>
              {voiceTone || "Campaign default (None)"}
            </option>
            <option value="Friendly, Exciting, Welcoming">
              Friendly, Exciting, Welcoming
            </option>
            <option value="Professional, Informative">
              Professional, Informative
            </option>
            <option value="Playful, Energetic">Playful, Energetic</option>
          </Select>

          <div>
            <p className="text-xs font-medium tracking-[0.12em] text-cos-muted uppercase">
              Quick suggestions
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {QUICK_SUGGESTIONS.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() =>
                    setInstructions((prev) =>
                      prev ? `${prev}. ${chip}` : chip,
                    )
                  }
                  className="border border-cos-border bg-cos-bg px-3 py-1.5 text-xs font-medium text-cos-text transition-colors hover:bg-cos-accent-soft"
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>
        </div>

        <Textarea
          label="Preview new caption"
          value={previewCaption}
          onChange={(e) => setPreviewCaption(e.target.value)}
          rows={4}
        />

        <div className="flex items-center justify-between gap-4">
          {errorMessage ? (
            <p className="text-sm text-red-600">{errorMessage}</p>
          ) : (
            <span />
          )}
          <Button onClick={() => void handleRegenerate()} disabled={isGenerating}>
            <Sparkles className="h-4 w-4" strokeWidth={1.5} />
            {isGenerating ? "Generating…" : "Regenerate caption"}
          </Button>
        </div>
      </div>
    </CampaignBuilderModal>
  );
}
