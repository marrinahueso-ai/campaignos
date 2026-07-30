import { buildOrganizationVoiceProfile } from "@/lib/brand-voice/organization-voice";
import { generateText, isAiConfigured } from "@/lib/ai/provider";
import { resolveFastDraftModel } from "@/lib/ai/models";
import {
  FLYER_COMPOSER_SLOTS_MAX_TOKENS,
  buildFlyerComposerSlotsSystemPrompt,
  buildFlyerComposerSlotsUserPrompt,
  parseFlyerComposerSlotsJson,
} from "@/lib/flyer-composer/generate-slots-prompt";
import type {
  FlyerComposerGenerateInput,
  FlyerComposerGenerateResult,
  FlyerComposerGeneratedSlots,
  FlyerComposerSlotFields,
} from "@/lib/flyer-composer/types";
import { coalesceSemesterCalendarSlots } from "@/lib/flyer-composer/semester-calendar";
import { getLatestOrganization } from "@/lib/organizations/queries";
import { getAiProfileByOrganizationId } from "@/lib/organization-intelligence/queries";
import { getAuthUser } from "@/lib/auth/queries";

const FIELD_KEYS: (keyof FlyerComposerSlotFields)[] = [
  "orgName",
  "headline",
  "schoolYear",
  "location",
  "directions",
  "datesEvents",
  "bodyCopy",
  "donationTiers",
  "ctaLabel",
  "ctaUrl",
  "qrUrl",
  "qrCaption",
  "footerLine",
  "lastYearNotes",
];

function hasAnyDirection(input: FlyerComposerGenerateInput): boolean {
  if (input.assets.customTemplatePresent) return true;
  if (input.assets.inspirationPhotoPresent) return true;
  if (input.start.path === "proven" || input.start.path === "new") return true;

  const f = input.fields;
  return FIELD_KEYS.some((key) => Boolean(f[key]?.trim()));
}

function mergeGeneratedSlots(
  input: FlyerComposerGenerateInput,
  generated: Record<string, string>,
): FlyerComposerGeneratedSlots {
  const merged: FlyerComposerGeneratedSlots = { ...input.fields };
  for (const [key, value] of Object.entries(generated)) {
    if (value.trim()) {
      (merged as Record<string, string>)[key] = value.trim();
    }
  }
  return coalesceSemesterCalendarSlots(input.template.templateId, merged);
}

export async function generateFlyerComposerSlots(
  input: FlyerComposerGenerateInput,
): Promise<FlyerComposerGenerateResult> {
  if (!isAiConfigured()) {
    return {
      success: false,
      error: "AI text generation isn't set up yet.",
      imageUrl: null,
      imageBase64: null,
      slots: null,
      aiUsed: false,
    };
  }

  if (!hasAnyDirection(input)) {
    return {
      success: false,
      error:
        "Add inspiration details — slots, notes, photo, or a template — before generating.",
      imageUrl: null,
      imageBase64: null,
      slots: null,
      aiUsed: false,
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

  const authUser = await getAuthUser();
  const model = resolveFastDraftModel();
  const result = await generateText({
    model,
    systemPrompt: buildFlyerComposerSlotsSystemPrompt(),
    userPrompt: buildFlyerComposerSlotsUserPrompt(
      input,
      organization?.name ?? null,
      brandVoiceSummary,
    ),
    maxTokens: FLYER_COMPOSER_SLOTS_MAX_TOKENS,
    temperature: 0.65,
    jsonMode: true,
    usage: {
      actionType: "flyer_composer_slots",
      organizationId: organization?.id ?? null,
      userId: authUser?.id ?? null,
      feature: "flyer_composer_slots",
    },
  });

  if (!result.success || !result.text) {
    return {
      success: false,
      error: result.error ?? "Unable to generate flyer copy right now.",
      imageUrl: null,
      imageBase64: null,
      slots: null,
      aiUsed: true,
    };
  }

  try {
    const generated = parseFlyerComposerSlotsJson(result.text);
    if (Object.keys(generated).length === 0) {
      return {
        success: false,
        error:
          "No slot copy was returned. Try adding more direction and regenerate.",
        imageUrl: null,
        imageBase64: null,
        slots: null,
        aiUsed: true,
      };
    }

    return {
      success: true,
      error: null,
      imageUrl: null,
      imageBase64: null,
      slots: mergeGeneratedSlots(input, generated),
      aiUsed: true,
    };
  } catch {
    return {
      success: false,
      error: "Could not read AI slot copy. Try again.",
      imageUrl: null,
      imageBase64: null,
      slots: null,
      aiUsed: true,
    };
  }
}
