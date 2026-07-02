import type {
  ArtworkImageQuality,
  ArtworkReasoningEffort,
} from "@/lib/artwork-v2/constants";

export type ArtworkGenerationMode = "quick" | "refined";

export interface ArtworkGenerationProfile {
  versionCount: number;
  quality: ArtworkImageQuality;
  reasoning: ArtworkReasoningEffort;
}

export const ARTWORK_GENERATION_PROFILES: Record<
  ArtworkGenerationMode,
  ArtworkGenerationProfile
> = {
  quick: {
    versionCount: 1,
    quality: "medium",
    reasoning: "low",
  },
  refined: {
    versionCount: 2,
    quality: "high",
    reasoning: "medium",
  },
};

export const ARTWORK_GENERATION_MODE_COPY: Record<
  ArtworkGenerationMode,
  { title: string; timing: string; detail: string }
> = {
  quick: {
    title: "Quick draft",
    timing: "~1 min",
    detail: "Fast first pass — one option to review or approve.",
  },
  refined: {
    title: "Refined design",
    timing: "~3–5 min",
    detail: "More time on layout and detail — two versions to compare.",
  },
};

export function resolveArtworkGenerationProfile(
  mode?: ArtworkGenerationMode | null,
): ArtworkGenerationProfile {
  return ARTWORK_GENERATION_PROFILES[mode === "quick" ? "quick" : "refined"];
}

export function parseArtworkGenerationMode(value: unknown): ArtworkGenerationMode {
  return value === "quick" ? "quick" : "refined";
}

export function parseArtworkGenerationModeFromForm(formData: FormData): ArtworkGenerationMode {
  return parseArtworkGenerationMode(String(formData.get("generationMode") ?? "").trim());
}
