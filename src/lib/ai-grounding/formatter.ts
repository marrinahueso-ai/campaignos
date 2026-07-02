import { GROUNDING_OMISSION_INSTRUCTION } from "@/lib/ai-grounding/rules";
import { hasVerifiedVolunteerNeeds } from "@/lib/events/volunteer-needs";
import type { GroundingContext } from "@/lib/ai-grounding/types";

function factLine(label: string, value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  return `- ${label}: ${trimmed}`;
}

export function formatGroundingContextForPrompt(context: GroundingContext): string {
  const { event, organization, schoolSetup, artwork, timelineStep, strategy } =
    context;

  const eventLines = [
    factLine("Title", event.title),
    factLine("Date", event.date),
    factLine("Time", event.time),
    factLine("Location", event.location),
    factLine("Audience", event.audience),
    factLine("Theme", event.theme),
    event.description
      ? `- Description: ${event.description}`
      : "- Description: (none provided — do not invent event details)",
    factLine("Event type", event.eventTypeLabel),
    factLine("Category", event.category),
    factLine("Communication plan", event.communicationStrategyLabel),
    factLine("Budget", event.budget),
    hasVerifiedVolunteerNeeds(event.volunteerNeeds)
      ? factLine("Volunteer needs", event.volunteerNeeds)
      : "- Volunteer needs: null (not on file — do NOT mention volunteers, volunteer roles, counts, or sign-up asks)",
    factLine("Event owner", event.eventOwner),
  ].filter(Boolean);

  const orgLines = [
    factLine("School / organization", organization.name),
    factLine("District", organization.district),
    factLine("School year", organization.schoolYear),
    factLine("Mascot", organization.mascot),
    factLine("Principal", organization.principal),
    factLine("School website", organization.schoolWebsite),
    factLine("PTO website", organization.ptoWebsite),
    factLine("Organization voice", organization.organizationVoice),
    factLine("Writing style", organization.writingStyle),
    factLine("Default audience", organization.audienceDefaults),
    factLine("Communication preferences", organization.communicationPreferences),
  ].filter(Boolean);

  const schoolSetupLines = [
    factLine("Primary brand color", schoolSetup.primaryColor),
    factLine("Secondary brand color", schoolSetup.secondaryColor),
    factLine("Brand font", schoolSetup.fontFamily),
    schoolSetup.hasPtoLogo ? "- PTO logo: uploaded" : null,
    schoolSetup.hasSchoolLogo ? "- School logo: uploaded" : null,
  ].filter(Boolean);

  const timelineLines = timelineStep
    ? [
        factLine("Step", timelineStep.stepTitle),
        factLine("Due date", timelineStep.dueDate),
        `- Relative timing: ${timelineStep.relativeDay} day(s) from event`,
        factLine("Channel", timelineStep.channelLabel),
        `- Required: ${timelineStep.isRequired ? "yes" : "no"}`,
      ].filter(Boolean)
    : ["- (Hub draft — not tied to a specific timeline step)"];

  const strategyLines = [
    factLine("Campaign stage", strategy.campaignStageLabel),
    factLine("Stage purpose", strategy.campaignStageDescription),
    factLine("Draft channel", strategy.channelLabel),
  ].filter(Boolean);

  const artworkLines =
    artwork.length > 0
      ? artwork.map(
          (asset) =>
            `- ${asset.assetTypeLabel}${asset.filename ? `: ${asset.filename}` : ""}${asset.aiGenerated ? " (AI-generated)" : " (uploaded)"}`,
        )
      : ["- No artwork uploaded — do not reference images or graphics"];

  const sections = [
    "=== GROUNDING CONTEXT (VERIFIED FACTS ONLY) ===",
    "Write only from the facts below. Do not add details from outside this list.",
    "",
    "EVENT",
    ...eventLines,
    "",
    "ORGANIZATION",
    orgLines.length > 0
      ? orgLines
      : ["- (No organization profile on file — use neutral school-appropriate language)"],
    "",
    "SCHOOL SETUP",
    schoolSetupLines.length > 0
      ? schoolSetupLines
      : ["- (No brand assets configured)"],
    "",
    "TIMELINE STEP",
    ...timelineLines,
    "",
    "COMMUNICATION STRATEGY",
    ...strategyLines,
    "",
    "UPLOADED ARTWORK",
    ...artworkLines,
    "",
    "ALLOWED TOPICS",
    ...context.allowedTopics.map((topic) => `- ${topic}`),
    "",
    "OMITTED TOPICS (do not mention)",
    ...context.omittedTopics.map((topic) => `- ${topic}`),
    "",
    GROUNDING_OMISSION_INSTRUCTION,
  ];

  return sections.flat().join("\n");
}

export function formatGroundingRulesBlock(): string {
  return [
    "=== GROUNDING RULES ===",
    "- Never invent volunteers, quantities, times, sponsors, mascots, or activities.",
    "- Never reference artwork generically — use uploaded artwork metadata when present.",
    "- When information is unknown, omit it rather than fabricate.",
  ].join("\n");
}
