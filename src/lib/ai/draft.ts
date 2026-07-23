import { createClient } from "@/lib/supabase/server";
import {
  buildCommunicationDraftContext,
} from "@/lib/ai/context";
import {
  buildDraftPromptsFromStrategy,
  buildDraftUserPrompt,
  buildLegacyDraftSystemPrompt,
} from "@/lib/ai/prompts";
import { DraftPerformanceTracker } from "@/lib/ai/draft-performance";
import { parseStrategyDraftResponse } from "@/lib/ai-strategy";
import { scoreDraftAgainstBrandVoice } from "@/lib/brand-voice";
import { generateText, isAiConfigured } from "@/lib/ai/provider";
import {
  maxCompletionTokensForChannel,
  resolveDraftModel,
  resolveFastDraftModel,
} from "@/lib/ai/models";
import type {
  DraftCommunicationInput,
  DraftCommunicationResult,
} from "@/lib/ai/types";

const CREATED_BY = "Hey Ralli Assistant";

async function saveCommunicationVersion(
  communicationItemId: string,
  content: string,
  performance: DraftPerformanceTracker,
): Promise<number | null> {
  const supabase = await createClient();
  const now = new Date().toISOString();

  const { data: existingVersions } = await supabase
    .from("communication_versions")
    .select("version_number")
    .eq("communication_item_id", communicationItemId)
    .order("version_number", { ascending: false })
    .limit(1);

  const nextVersion = (existingVersions?.[0]?.version_number ?? 0) + 1;

  const { error: versionError } = await performance.time("saveVersion", async () =>
    supabase.from("communication_versions").insert({
      communication_item_id: communicationItemId,
      content,
      version_number: nextVersion,
      created_by: CREATED_BY,
    }),
  );

  if (versionError) {
    console.error("Failed to save AI draft version:", versionError.message);
    return null;
  }

  console.info("✓ Draft saved", { communicationItemId, versionNumber: nextVersion });

  const { error: itemError } = await performance.time("statusUpdate", async () =>
    supabase
      .from("communication_items")
      .update({
        status: "generated",
        last_updated: now,
        updated_at: now,
      })
      .eq("id", communicationItemId),
  );

  if (itemError) {
    console.error("Failed to update communication item:", itemError.message);
    return null;
  }

  console.info("✓ Version created", { communicationItemId, versionNumber: nextVersion });

  return nextVersion;
}

export async function draftCommunicationWithAi(
  input: DraftCommunicationInput,
): Promise<DraftCommunicationResult> {
  const performance =
    input.performance ?? DraftPerformanceTracker.markActionReceived();

  performance.setMeta({
    eventId: input.eventId,
    channel: input.channel,
    communicationItemId: input.communicationItemId,
    configuredModel: resolveFastDraftModel(),
  });

  if (!isAiConfigured()) {
    performance.printSummary();
    return {
      success: false,
      error: "Drafting help isn't set up yet.",
      draftText: null,
      strategyExplanation: null,
      versionNumber: null,
    };
  }

  const context = await buildCommunicationDraftContext(
    {
      eventId: input.eventId,
      communicationItemId: input.communicationItemId,
      channel: input.channel,
      stepId: input.stepId,
      instructions: input.instructions,
    },
    performance,
  );

  if (!context) {
    performance.printSummary();
    return {
      success: false,
      error: "Event context could not be loaded.",
      draftText: null,
      strategyExplanation: null,
      versionNumber: null,
    };
  }

  const prompts = performance.timeSync("promptAssembly", () =>
    context.strategyPlan
      ? buildDraftPromptsFromStrategy(context.strategyPlan)
      : {
          systemPrompt: buildLegacyDraftSystemPrompt(),
          userPrompt: buildDraftUserPrompt(context),
          strategyExplanation: null,
        },
  );

  const draftModel = resolveDraftModel("fast_draft");
  const maxTokens = maxCompletionTokensForChannel(input.channel);

  const generation = await performance.time("openAi", () =>
    generateText({
      systemPrompt: prompts.systemPrompt,
      userPrompt: prompts.userPrompt,
      model: draftModel,
      maxTokens,
      usage: {
        actionType: "draft_communication",
        eventId: input.eventId,
        channel: input.channel,
      },
    }),
  );

  performance.setMeta({
    model: generation.model,
    promptTokens: generation.promptTokens,
    completionTokens: generation.completionTokens,
    totalTokens: generation.totalTokens,
    usedFallbackModel: generation.usedFallbackModel,
    configuredModel: draftModel,
  });

  if (!generation.success || !generation.text) {
    performance.printSummary();
    return {
      success: false,
      error: generation.error ?? "Drafting failed.",
      draftText: null,
      strategyExplanation: null,
      versionNumber: null,
    };
  }

  const parsed = performance.timeSync("parsing", () =>
    parseStrategyDraftResponse(generation.text!),
  );
  const strategyExplanation =
    parsed.strategyExplanation || prompts.strategyExplanation;

  if (strategyExplanation) {
    console.info("✓ Strategy explanation", { strategyExplanation });
  }

  const voiceScore = performance.timeSync("scoring", () =>
    scoreDraftAgainstBrandVoice({
      draftText: parsed.draftText,
      brandVoice: context.brandVoiceContext,
      channel: input.channel,
    }),
  );
  console.info("✓ Brand voice score", {
    overall: voiceScore.overall,
    strengths: voiceScore.strengths,
    suggestions: voiceScore.suggestions,
  });

  const versionNumber = await saveCommunicationVersion(
    input.communicationItemId,
    parsed.draftText,
    performance,
  );

  if (versionNumber == null) {
    performance.printSummary();
    return {
      success: false,
      error: "Could not save the draft.",
      draftText: null,
      strategyExplanation: null,
      versionNumber: null,
    };
  }

  if (!input.performance) {
    performance.printSummary();
  }

  return {
    success: true,
    error: null,
    draftText: parsed.draftText,
    strategyExplanation,
    versionNumber,
  };
}
