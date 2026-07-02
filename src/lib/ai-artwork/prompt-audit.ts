import type { ArtworkV2OrchestrationRequest } from "@/lib/artwork-v2/orchestrator";
import { ARTWORK_V2_MAX_INSPIRATION_IMAGES } from "@/lib/artwork-v2/constants";

export type ArtworkGenerationPayloadAudit = {
  userManualPrompt: string;
  finalPrompt: string;
  size: string;
  inspirationImageCount: 0 | 1;
  manualPromptLength: number;
  finalPromptLength: number;
  promptMatchesManualPrompt: boolean;
  valid: boolean;
  violations: string[];
};

export type ArtworkV2OrchestrationPayloadAudit = {
  userManualPrompt: string;
  orchestrationKind: "create" | "adjust";
  size: string;
  userPromptLength: number;
  inspirationImageCount: number;
  previousImageIncluded: boolean;
  valid: boolean;
  violations: string[];
};

const LEGACY_INJECTION_MARKERS = [
  "Do NOT recreate",
  "Use attached inspiration",
  "Creative direction",
  "brand colors",
  "typography",
  "negative prompt",
];

export function isArtworkPromptDebugEnabled(): boolean {
  return process.env.NEXT_PUBLIC_ARTWORK_DEBUG === "1";
}

export function auditArtworkGenerationPayload(input: {
  userManualPrompt: string;
  finalPrompt: string;
  referenceImageUrl: string | null | undefined;
  size: string;
}): ArtworkGenerationPayloadAudit {
  const violations: string[] = [];
  const inspirationImageCount = input.referenceImageUrl?.trim() ? 1 : 0;
  const promptMatchesManualPrompt = input.finalPrompt === input.userManualPrompt;

  if (!promptMatchesManualPrompt) {
    violations.push("final prompt differs from user manual prompt");
  }

  if (inspirationImageCount > 1) {
    violations.push("more than one inspiration image attached");
  }

  return {
    userManualPrompt: input.userManualPrompt,
    finalPrompt: input.finalPrompt,
    size: input.size,
    inspirationImageCount,
    manualPromptLength: input.userManualPrompt.length,
    finalPromptLength: input.finalPrompt.length,
    promptMatchesManualPrompt,
    valid: violations.length === 0,
    violations,
  };
}

export function auditArtworkV2OrchestrationPayload(input: {
  userManualPrompt: string;
  orchestration: ArtworkV2OrchestrationRequest;
  size: string;
}): ArtworkV2OrchestrationPayloadAudit {
  const violations: string[] = [];
  const inspirationImageCount = input.orchestration.inspirationImageUrls.length;
  const previousImageIncluded =
    input.orchestration.kind === "adjust" && Boolean(input.orchestration.previousImageUrl?.trim());

  if (!input.userManualPrompt.trim()) {
    violations.push("user manual prompt is empty");
  }

  if (input.userManualPrompt !== input.orchestration.userPrompt) {
    violations.push("orchestration user prompt differs from manual prompt");
  }

  if (input.orchestration.kind === "adjust" && !input.orchestration.adjustmentComments.trim()) {
    violations.push("adjust orchestration missing user comments");
  }

  if (inspirationImageCount > ARTWORK_V2_MAX_INSPIRATION_IMAGES) {
    violations.push(`more than ${ARTWORK_V2_MAX_INSPIRATION_IMAGES} inspiration images attached`);
  }

  for (const marker of LEGACY_INJECTION_MARKERS) {
    if (input.orchestration.userPrompt.includes(marker)) {
      violations.push(`legacy injection marker found in user prompt: ${marker}`);
    }
  }

  return {
    userManualPrompt: input.userManualPrompt,
    orchestrationKind: input.orchestration.kind,
    size: input.size,
    userPromptLength: input.orchestration.userPrompt.length,
    inspirationImageCount,
    previousImageIncluded,
    valid: violations.length === 0,
    violations,
  };
}

export function logArtworkGenerationPayloadAudit(
  audit: ArtworkGenerationPayloadAudit | ArtworkV2OrchestrationPayloadAudit,
): void {
  if (!isArtworkPromptDebugEnabled() && process.env.NODE_ENV !== "development") {
    return;
  }

  if ("orchestrationKind" in audit) {
    if (isArtworkPromptDebugEnabled()) {
      console.info(
        JSON.stringify({
          orchestrationKind: audit.orchestrationKind,
          userPromptLength: audit.userPromptLength,
          inspirationImageCount: audit.inspirationImageCount,
          previousImageIncluded: audit.previousImageIncluded,
          imageSize: audit.size,
        }),
      );
    } else if (process.env.NODE_ENV === "development") {
      console.info("[Artwork v2 Orchestration Audit]", {
        valid: audit.valid,
        violations: audit.violations,
        orchestrationKind: audit.orchestrationKind,
        inspirationImageCount: audit.inspirationImageCount,
        previousImageIncluded: audit.previousImageIncluded,
        size: audit.size,
      });
    }

    if (!audit.valid) {
      console.warn("[Artwork v2 Orchestration Audit] Payload failed thin-orchestration check.", audit);
    }

    return;
  }

  if (isArtworkPromptDebugEnabled()) {
    console.info("FINAL_IMAGE_PROMPT_START");
    console.info(audit.finalPrompt);
    console.info("FINAL_IMAGE_PROMPT_END");
    console.info(
      JSON.stringify({
        manualPromptLength: audit.manualPromptLength,
        finalPromptLength: audit.finalPromptLength,
        promptMatchesManualPrompt: audit.promptMatchesManualPrompt,
        inspirationImageCount: audit.inspirationImageCount,
        imageSize: audit.size,
      }),
    );
  } else if (process.env.NODE_ENV === "development") {
    console.info("[Artwork Prompt Audit]", {
      valid: audit.valid,
      violations: audit.violations,
      promptMatchesManualPrompt: audit.promptMatchesManualPrompt,
      inspirationImageCount: audit.inspirationImageCount,
      size: audit.size,
    });
  }

  if (!audit.valid) {
    console.warn("[Artwork Prompt Audit] Prompt payload failed zero-creative-direction check.", audit);
  }
}
