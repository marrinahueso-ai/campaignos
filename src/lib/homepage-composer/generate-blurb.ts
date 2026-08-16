import { buildOrganizationVoiceProfile } from "@/lib/brand-voice/organization-voice";
import { generateText, isAiConfigured } from "@/lib/ai/provider";
import { resolveFastDraftModel } from "@/lib/ai/models";
import {
  HOMEPAGE_BLURB_MAX_TOKENS,
  buildHomepageBlurbSystemPrompt,
  buildHomepageBlurbUserPrompt,
  clampBlurbToMaxSentences,
  normalizeHomepageBlurbText,
  stripStaleHomepageBlurbOpener,
} from "@/lib/homepage-composer/generate-blurb-prompt";
import { getLatestOrganization } from "@/lib/organizations/queries";
import { getAiProfileByOrganizationId } from "@/lib/organization-intelligence/queries";

export type GenerateHomepageBlurbInput = {
  title: string;
  seedNotes: string;
  date?: string | null;
  time?: string | null;
  startsOn?: string | null;
  expiresOn?: string | null;
  alwaysOn?: boolean;
  linkUrl?: string | null;
  eventId?: string | null;
  siblingBlurbs?: string[];
  varietyNonce?: number;
};

export type GenerateHomepageBlurbResult = {
  success: boolean;
  error: string | null;
  blurb: string | null;
};

export async function generateHomepageCardBlurb(
  input: GenerateHomepageBlurbInput,
): Promise<GenerateHomepageBlurbResult> {
  if (!isAiConfigured()) {
    return {
      success: false,
      error: "AI text generation isn't set up yet.",
      blurb: null,
    };
  }

  if (!input.title.trim() && !input.seedNotes.trim()) {
    return {
      success: false,
      error: "Add a title or a few notes before generating text.",
      blurb: null,
    };
  }

  const organization = await getLatestOrganization();
  const profile = organization
    ? await getAiProfileByOrganizationId(organization.id)
    : null;
  const voiceProfile = buildOrganizationVoiceProfile({ organization, profile });
  const brandVoiceSummary = [
    voiceProfile.personality,
    voiceProfile.sourceVoiceNotes,
    voiceProfile.writingStyle
      ? `Writing style: ${voiceProfile.writingStyle}`
      : null,
  ]
    .filter(Boolean)
    .join(" | ");

  const model = resolveFastDraftModel();
  const result = await generateText({
    model,
    systemPrompt: buildHomepageBlurbSystemPrompt(),
    userPrompt: buildHomepageBlurbUserPrompt({
      title: input.title,
      seedNotes: input.seedNotes,
      date: input.date ?? null,
      time: input.time ?? null,
      startsOn: input.startsOn ?? null,
      expiresOn: input.expiresOn ?? null,
      alwaysOn: Boolean(input.alwaysOn),
      linkUrl: input.linkUrl ?? null,
      organizationName: organization?.name ?? null,
      brandVoiceSummary:
        brandVoiceSummary ||
        "Warm, specific, community-first organization voice.",
      siblingBlurbs: input.siblingBlurbs ?? [],
      varietyNonce: input.varietyNonce ?? 0,
    }),
    maxTokens: HOMEPAGE_BLURB_MAX_TOKENS,
    temperature: 0.85,
    usage: {
      actionType: "homepage_composer_blurb",
      eventId: input.eventId ?? null,
      organizationId: organization?.id ?? null,
      feature: "homepage_composer_blurb",
    },
  });

  if (!result.success || !result.text) {
    return {
      success: false,
      error: result.error ?? "Unable to generate text right now.",
      blurb: null,
    };
  }

  const blurb = stripStaleHomepageBlurbOpener(
    clampBlurbToMaxSentences(normalizeHomepageBlurbText(result.text)),
  );
  if (!blurb) {
    return {
      success: false,
      error: "No text was returned. Try again.",
      blurb: null,
    };
  }

  return { success: true, error: null, blurb };
}
