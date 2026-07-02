import { resolveFinalArtworkImagePrompt } from "@/lib/ai-artwork/generation-mode";

/** Adjust generation sends original manual prompt plus user comments — nothing else. */
export function resolveArtworkV2AdjustPrompt(
  originalManualPrompt: string,
  adjustmentComments: string,
): string {
  const original = resolveFinalArtworkImagePrompt(originalManualPrompt);
  const comments = adjustmentComments.trim();
  if (!comments) {
    return original;
  }
  return `${original}\n\n${comments}`;
}
