import { buildOrganizationVoiceProfile } from "@/lib/brand-voice/organization-voice";
import { buildVocabularyDictionary } from "@/lib/brand-voice/vocabulary";
import { resolveChannelPersonality } from "@/lib/brand-voice/channel-personality";
import { selectOpeningPatterns, extractOpeningHintsFromDrafts } from "@/lib/brand-voice/openings";
import { selectClosingPatterns } from "@/lib/brand-voice/closings";
import { buildStyleRules } from "@/lib/brand-voice/style-rules";
import { loadEditingMemorySummary } from "@/lib/brand-voice/editing-memory";
import type { BuildBrandVoiceContextInput, BrandVoiceContext } from "@/lib/brand-voice/types";
import { getLatestOrganization, getOrganizationById } from "@/lib/organizations/queries";
import { getAiProfileByOrganizationId } from "@/lib/organization-intelligence/queries";
import { displayDraftContent } from "@/lib/ai/content";
import { createClient } from "@/lib/supabase/server";
import type { Organization } from "@/types";

export type {
  BrandVoiceContext,
  BrandVoiceScore,
  BuildBrandVoiceContextInput,
  OrganizationVoiceProfile,
  VocabularyDictionary,
  ChannelPersonality,
  EditingMemoryRecord,
  EditingMemorySummary,
  RecordEditingMemoryInput,
} from "@/lib/brand-voice/types";

export { buildOrganizationVoiceProfile } from "@/lib/brand-voice/organization-voice";
export { buildVocabularyDictionary } from "@/lib/brand-voice/vocabulary";
export { resolveChannelPersonality } from "@/lib/brand-voice/channel-personality";
export { selectOpeningPatterns, extractOpeningHintsFromDrafts } from "@/lib/brand-voice/openings";
export { selectClosingPatterns } from "@/lib/brand-voice/closings";
export { buildStyleRules } from "@/lib/brand-voice/style-rules";
export {
  appendEditingMemoryRecord,
  compareDraftToApprovedEdit,
  getLatestAiDraftForItem,
  loadEditingMemorySummary,
} from "@/lib/brand-voice/editing-memory";
export { scoreDraftAgainstBrandVoice } from "@/lib/brand-voice/scoring";
export {
  formatBrandVoiceForPrompt,
  buildBrandVoiceSystemPromptAddendum,
  formatWritingPhilosophyBlock,
  BRAND_VOICE_SYSTEM_RULES,
} from "@/lib/brand-voice/prompt-builder";
export {
  resolveEmotionalTarget,
  formatWritingPhilosophyForPrompt,
  buildWritingPhilosophySystemRules,
} from "@/lib/brand-voice/writing-philosophy";

export async function buildBrandVoiceContext(
  input: BuildBrandVoiceContextInput,
): Promise<BrandVoiceContext> {
  const organization =
    input.organizationId != null
      ? await resolveOrganization(input.organizationId, input.organizationName)
      : await getLatestOrganization();

  const organizationId = organization?.id ?? input.organizationId;
  const profile = organizationId
    ? await getAiProfileByOrganizationId(organizationId)
    : null;

  const voiceProfile = buildOrganizationVoiceProfile({ organization, profile });
  const vocabulary = buildVocabularyDictionary({
    organization,
    profile,
    eventTitle: input.eventTitle,
  });
  const channelPersonality = resolveChannelPersonality({
    channel: input.channel,
    profile: voiceProfile,
    aiProfile: profile,
  });
  const styleRules = buildStyleRules(voiceProfile);

  const usedOpeningHints = [
    ...(input.usedOpeningHints ?? []),
    ...(input.eventId
      ? await loadCampaignOpeningHints(input.eventId, input.communicationItemId)
      : []),
  ];

  const openingOptions = selectOpeningPatterns({
    channel: input.channel,
    avoidHints: usedOpeningHints,
  });
  const closingOptions = selectClosingPatterns({ channel: input.channel });
  const editingMemory = await loadEditingMemorySummary({
    organizationId,
    channel: input.channel,
  });

  return {
    profile: voiceProfile,
    vocabulary,
    channelPersonality,
    styleRules,
    openingOptions,
    closingOptions,
    avoidOpenings: usedOpeningHints.slice(0, 6),
    editingMemory,
  };
}

async function resolveOrganization(
  organizationId: string,
  organizationName: string | null,
): Promise<Organization | null> {
  const byId = await getOrganizationById(organizationId);
  if (byId) return byId;

  const latest = await getLatestOrganization();
  if (latest?.id === organizationId) return latest;

  if (organizationName) {
    return {
      id: organizationId,
      name: organizationName,
      district: null,
      schoolYear: null,
      mascot: null,
      principal: null,
      schoolWebsite: null,
      ptoWebsite: null,
      timezone: "America/Chicago",
      preferredPostingHours: null,
      foundingAccessCode: null,
      billingExemptAt: null,
      createdAt: new Date().toISOString(),
    };
  }

  return latest;
}

async function loadCampaignOpeningHints(
  eventId: string,
  currentItemId?: string,
): Promise<string[]> {
  const supabase = await createClient();

  const { data: items } = await supabase
    .from("communication_items")
    .select("id")
    .eq("event_id", eventId);

  if (!items?.length) return [];

  const itemIds = items
    .map((item) => item.id as string)
    .filter((id) => id !== currentItemId);

  if (itemIds.length === 0) return [];

  const { data: versions } = await supabase
    .from("communication_versions")
    .select("communication_item_id, content, version_number")
    .in("communication_item_id", itemIds)
    .order("version_number", { ascending: false });

  if (!versions?.length) return [];

  const latestByItem = new Map<string, string>();
  for (const row of versions) {
    const itemId = row.communication_item_id as string;
    if (latestByItem.has(itemId)) continue;

    const content = displayDraftContent(row.content as string | null);
    if (content) {
      latestByItem.set(itemId, content);
    }
  }

  return extractOpeningHintsFromDrafts([...latestByItem.values()]);
}
