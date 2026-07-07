import "server-only";

import { buildOrganizationVoiceProfile } from "@/lib/brand-voice/organization-voice";
import { generateText, isAiConfigured } from "@/lib/ai/provider";
import { logAiUsage } from "@/lib/ai/usage";
import { resolveFastDraftModel } from "@/lib/ai/models";
import { getLatestOrganization } from "@/lib/organizations/queries";
import { getAiProfileByOrganizationId } from "@/lib/organization-intelligence/queries";
import type { CampaignDirectorReport } from "@/lib/campaign-director/types";
import type { CampaignDirectorContext } from "@/lib/campaign-director/types";

export function buildDeterministicAdvisorMessage(
  report: CampaignDirectorReport,
): string {
  if (report.recommendations.some((rec) => rec.priority === "completed")) {
    return "This campaign is almost ready. Review publishing to schedule the remaining sends.";
  }

  const critical = report.recommendations.filter(
    (rec) => rec.priority === "critical",
  );
  if (critical.length > 0) {
    const focus = critical[0]!.title.replace(/\.$/, "");
    return `Focus next on ${focus.toLowerCase()}. Clearing that will keep the campaign on schedule.`;
  }

  if (report.risks.some((risk) => risk.id === "missing-artwork")) {
    return "Creative artwork is still missing. Upload a hero image or flyer before final approvals.";
  }

  if (report.nextAction) {
    return `This campaign's next best step is to ${report.nextAction.verb.toLowerCase()} ${report.nextAction.description.toLowerCase()}.`;
  }

  if (report.healthScore >= 80) {
    return "This campaign is in good shape. A quick timeline review should be enough for now.";
  }

  return report.summary;
}

function buildAdvisorPrompt(report: CampaignDirectorReport): {
  system: string;
  user: string;
} {
  const riskLines =
    report.risks.length > 0
      ? report.risks.map((risk) => `- ${risk.label}`).join("\n")
      : "- None identified";

  const recommendationLines =
    report.recommendations.length > 0
      ? report.recommendations
          .slice(0, 5)
          .map((rec) => `- [${rec.priority}] ${rec.title}`)
          .join("\n")
      : "- None";

  return {
    system: [
      "You are the Hey Ralli AI Campaign Director.",
      "Give concise campaign advice in 1–3 sentences.",
      "Use only the verified campaign facts provided.",
      "Never invent dates, channels, approvals, or assets that are not listed.",
      "Do not write parent-facing copy or draft messages.",
      "Be calm, practical, and specific about what the communications lead should do next.",
    ].join(" "),
    user: [
      `Campaign: ${report.eventTitle}`,
      `Health score: ${report.healthScore}%`,
      `Summary: ${report.summary}`,
      `Ready to publish: ${report.readiness.label}`,
      "",
      "RISKS",
      riskLines,
      "",
      "RECOMMENDATIONS",
      recommendationLines,
      "",
      "Write 1–3 sentences of advice for the communications lead.",
    ].join("\n"),
  };
}

export async function generateAiCampaignAdvice(
  report: CampaignDirectorReport,
  context: CampaignDirectorContext,
): Promise<string | null> {
  if (!isAiConfigured()) {
    return null;
  }

  const organization = await getLatestOrganization();
  const aiProfile = organization
    ? await getAiProfileByOrganizationId(organization.id)
    : null;
  const voice = buildOrganizationVoiceProfile({ organization, profile: aiProfile });
  const brandVoiceSummary = [
    voice.personality,
    voice.sourceVoiceNotes,
    voice.writingStyle ? `Writing style: ${voice.writingStyle}` : null,
  ]
    .filter(Boolean)
    .join(" | ");

  const { system, user } = buildAdvisorPrompt(report);
  const systemWithVoice = `${system}\nBrand voice: ${brandVoiceSummary || voice.personality}`;

  try {
    const result = await generateText({
      model: resolveFastDraftModel(),
      systemPrompt: systemWithVoice,
      userPrompt: user,
      maxTokens: 180,
      temperature: 0.5,
    });

    if (!result.success || !result.text) {
      return null;
    }

    await logAiUsage({
      eventId: context.input.event.id,
      actionType: "draft_communication",
      channel: "email",
      model: result.model,
      promptTokens: result.promptTokens,
      completionTokens: result.completionTokens,
      totalTokens: result.totalTokens,
      success: true,
    });

    const text = result.text.trim();
    return text.length > 0 ? text : null;
  } catch {
    return null;
  }
}

export async function resolveCampaignAdvisorMessage(
  report: CampaignDirectorReport,
  context: CampaignDirectorContext,
  useAi: boolean,
): Promise<string> {
  const fallback = buildDeterministicAdvisorMessage(report);

  if (!useAi) {
    return fallback;
  }

  const aiMessage = await generateAiCampaignAdvice(report, context);
  return aiMessage ?? fallback;
}
