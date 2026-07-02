import { assembleGroundingContext } from "@/lib/ai-grounding/assemble";
import { buildArtworkGroundingFacts } from "@/lib/ai-grounding/artwork-facts";
import { buildEventGroundingFacts } from "@/lib/ai-grounding/event-facts";
import {
  buildOrganizationGroundingFacts,
  buildSchoolSetupGroundingFacts,
} from "@/lib/ai-grounding/organization-facts";
import { buildTimelineStepGroundingFacts } from "@/lib/ai-grounding/timeline-facts";
import type {
  BuildGroundingContextInput,
  GroundingContext,
} from "@/lib/ai-grounding/types";
import { getEventById } from "@/lib/events/queries";
import { getEventWorkspaceData } from "@/lib/event-workspace/queries";
import { getAiProfileByOrganizationId } from "@/lib/organization-intelligence/queries";
import { getLatestOrganization, getSchoolProfile } from "@/lib/organizations/queries";
import { getEventPlaybookData } from "@/lib/playbooks/queries";

export type {
  BuildGroundingContextInput,
  GroundingContext,
  EventGroundingFacts,
  OrganizationGroundingFacts,
  SchoolSetupGroundingFacts,
  ArtworkGroundingFact,
  TimelineStepGroundingFacts,
  CommunicationStrategyGroundingFacts,
} from "@/lib/ai-grounding/types";

export {
  GROUNDING_SYSTEM_RULES,
  GROUNDING_OMISSION_INSTRUCTION,
} from "@/lib/ai-grounding/rules";

export {
  formatGroundingContextForPrompt,
  formatGroundingRulesBlock,
} from "@/lib/ai-grounding/formatter";

export { enrichGroundingWithCampaignStage } from "@/lib/ai-grounding/assemble";
export { hasUploadedArtwork } from "@/lib/ai-grounding/artwork-facts";

/**
 * Assembles a factual context package from verified database records only.
 * Required input for every communication draft.
 */
export async function buildGroundingContext(
  input: BuildGroundingContextInput,
): Promise<GroundingContext | null> {
  const [event, organization, schoolProfile, workspace, playbookData] =
    await Promise.all([
      getEventById(input.eventId),
      getLatestOrganization(),
      getSchoolProfile(),
      getEventWorkspaceData(input.eventId),
      input.stepId ? getEventPlaybookData(input.eventId) : Promise.resolve(null),
    ]);

  if (!event) return null;

  const profile = organization
    ? await getAiProfileByOrganizationId(organization.id)
    : null;

  const playbookStep = input.stepId
    ? (playbookData?.steps.find((step) => step.id === input.stepId) ?? null)
    : null;

  const eventFacts = buildEventGroundingFacts(event);
  const organizationFacts = buildOrganizationGroundingFacts({
    organization,
    profile,
  });
  const schoolSetupFacts = buildSchoolSetupGroundingFacts(schoolProfile);
  const artworkFacts = buildArtworkGroundingFacts(workspace?.assets ?? []);
  const timelineStepFacts = buildTimelineStepGroundingFacts(playbookStep);

  return assembleGroundingContext({
    event: eventFacts,
    organization: organizationFacts,
    schoolSetup: schoolSetupFacts,
    artwork: artworkFacts,
    timelineStep: timelineStepFacts,
    channel: input.channel,
    campaignStageLabel: input.campaignStageLabel,
    campaignStageDescription: input.campaignStageDescription,
  });
}
