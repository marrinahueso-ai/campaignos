import type { ArtDirection } from "@/lib/ai-strategy/types";
import type { ArtworkGroundingFact } from "@/lib/ai-grounding/types";
import type { CommunicationChannel } from "@/types/event-workspace";
import type { CampaignStageId } from "@/lib/ai-strategy/types";

function describeArtworkFacts(facts: ArtworkGroundingFact[]): string[] {
  return facts.map((asset) => {
    const filename = asset.filename ? ` (${asset.filename})` : "";
    const source = asset.aiGenerated ? "AI-generated" : "uploaded";
    return `${asset.assetTypeLabel}${filename} — ${source}`;
  });
}

export function resolveArtDirection(input: {
  artworkFacts: ArtworkGroundingFact[];
  channel: CommunicationChannel;
  stageId: CampaignStageId;
  eventTheme: string | null;
}): ArtDirection {
  const visualReferences: string[] = [];
  let strategy: string;
  let layoutNotes: string | null = null;
  const artworkAvailable = input.artworkFacts.length > 0;

  if (artworkAvailable) {
    const descriptions = describeArtworkFacts(input.artworkFacts);
    strategy =
      "Uploaded artwork exists — reference specific assets by type and filename from verified facts only.";
    visualReferences.push(
      `Verified artwork on file: ${descriptions.join("; ")}.`,
    );
    visualReferences.push(
      "When mentioning visuals, name the asset type and filename exactly — never say 'featured graphic', 'attached image', or similar.",
    );
  } else {
    strategy =
      "No artwork uploaded — write copy that stands alone without referencing any image, graphic, flyer, or visual.";
    visualReferences.push("Do not reference photos, graphics, or attached images.");
  }

  switch (input.channel) {
    case "instagram":
      layoutNotes = artworkAvailable
        ? "Assume the listed uploaded artwork accompanies the caption; leave room for hashtags at the end."
        : "Write a caption that works without a custom graphic.";
      break;
    case "flyer":
      layoutNotes =
        "Structure as headline, verified key details, and one call to action with line breaks.";
      break;
    case "website_announcement":
      layoutNotes = "Lead with the most important verified detail families need first.";
      break;
    default:
      layoutNotes = null;
  }

  if (input.eventTheme?.trim()) {
    visualReferences.push(
      `Verified event theme (use only if natural): ${input.eventTheme.trim()}`,
    );
  }

  if (input.stageId === "thank_you" && artworkAvailable) {
    visualReferences.push(
      "A thank-you message may reference uploaded event artwork by its verified type and filename.",
    );
  }

  return {
    artworkAvailable,
    artworkFacts: input.artworkFacts,
    strategy,
    visualReferences,
    layoutNotes,
  };
}
