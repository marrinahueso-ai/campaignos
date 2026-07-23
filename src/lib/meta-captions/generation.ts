import { generateText, isAiConfigured } from "@/lib/ai/provider";
import { resolveSocialMetaMilestonesForEvent } from "@/lib/campaign-plan/resolve-plan-milestones";
import {
  getApprovedFeedArtworkByMilestone,
  getApprovedFeedArtworkUrlForMilestone,
} from "@/lib/meta-captions/artwork-context";
import { buildMetaCaptionFactsBlock } from "@/lib/meta-captions/facts";
import {
  META_CAPTION_FEED_MAX_TOKENS,
  META_CAPTION_STORY_MAX_TOKENS,
  resolveMetaCaptionModel,
} from "@/lib/meta-captions/constants";
import {
  buildMetaCaptionSystemPrompt,
  buildMetaCaptionUserPrompt,
} from "@/lib/meta-captions/prompts";
import {
  getCaptionForMilestone,
  getMetaSocialCaptionsForEvent,
  upsertMetaSocialCaption,
} from "@/lib/meta-captions/queries";
import { getEventById } from "@/lib/events/queries";
import type {
  MetaCaptionGenerationOptions,
  MetaSocialCaptionActionResult,
  MetaSocialCaptionMilestone,
  MetaSocialCaptionPlacement,
} from "@/lib/meta-captions/types";

function normalizeCaption(text: string): string {
  return text
    .trim()
    .replace(/^["']|["']$/g, "")
    .replace(/^caption:\s*/i, "")
    .trim();
}

export async function generateMetaSocialCaption(input: {
  eventId: string;
  relativeDay: number;
  milestoneTitle: string;
  placement: MetaSocialCaptionPlacement;
  existingFeedCaption?: string | null;
  generationOptions?: MetaCaptionGenerationOptions;
}): Promise<MetaSocialCaptionActionResult> {
  if (!isAiConfigured()) {
    return { success: false, error: "AI caption generation is not configured." };
  }

  const event = await getEventById(input.eventId);
  if (!event) {
    return { success: false, error: "Event not found." };
  }

  const factsBlock = await buildMetaCaptionFactsBlock({
    eventId: input.eventId,
    relativeDay: input.relativeDay,
    milestoneTitle: input.milestoneTitle,
  });

  if (!factsBlock) {
    return { success: false, error: "Could not load event facts." };
  }

  const model = resolveMetaCaptionModel();
  const maxTokens =
    input.placement === "feed" ? META_CAPTION_FEED_MAX_TOKENS : META_CAPTION_STORY_MAX_TOKENS;

  const artworkImageUrl = await getApprovedFeedArtworkUrlForMilestone({
    eventId: input.eventId,
    relativeDay: input.relativeDay,
  });
  const hasArtworkImage = Boolean(artworkImageUrl);

  let revisionContext = input.generationOptions?.revisionContext?.trim() ?? null;
  if (!revisionContext && input.placement === "feed") {
    const captions = await getMetaSocialCaptionsForEvent(input.eventId);
    revisionContext =
      getCaptionForMilestone(captions, input.relativeDay, "feed")?.content?.trim() ?? null;
  }

  const promptInput = {
    placement: input.placement,
    milestoneTitle: input.milestoneTitle,
    relativeDay: input.relativeDay,
    eventDate: event.date,
    factsBlock,
    existingFeedCaption: input.existingFeedCaption,
    revisionContext,
    hasArtworkImage,
    tone: input.generationOptions?.tone,
    length: input.generationOptions?.length,
  };

  const captionUsage = {
    actionType: "meta_social_caption" as const,
    eventId: input.eventId,
    channel:
      input.placement === "feed"
        ? ("facebook" as const)
        : ("instagram" as const),
  };

  let generation = await generateText({
    systemPrompt: buildMetaCaptionSystemPrompt({ hasArtworkImage }),
    userPrompt: buildMetaCaptionUserPrompt(promptInput),
    model,
    maxTokens,
    imageUrl: artworkImageUrl,
    usage: captionUsage,
  });

  if ((!generation.success || !generation.text?.trim()) && hasArtworkImage) {
    generation = await generateText({
      systemPrompt: buildMetaCaptionSystemPrompt({ hasArtworkImage: false }),
      userPrompt: buildMetaCaptionUserPrompt({ ...promptInput, hasArtworkImage: false }),
      model,
      maxTokens,
      usage: captionUsage,
    });
  }

  if (!generation.success || !generation.text?.trim()) {
    return {
      success: false,
      error: generation.error ?? "Caption generation failed.",
    };
  }

  const content = normalizeCaption(generation.text);

  const saved = await upsertMetaSocialCaption({
    eventId: input.eventId,
    relativeDay: input.relativeDay,
    milestoneTitle: input.milestoneTitle,
    placement: input.placement,
    content,
    status: "draft",
  });

  if (!saved.success) {
    return { success: false, error: saved.error ?? "Could not save caption." };
  }

  return { success: true, content };
}

/** Generate a story caption from an existing feed caption (Phase 3). */
export async function syncStoryFromFeedCaption(input: {
  eventId: string;
  relativeDay: number;
  milestoneTitle: string;
  feedCaption: string;
}): Promise<MetaSocialCaptionActionResult> {
  const feedCaption = input.feedCaption.trim();
  if (!feedCaption) {
    return { success: false, error: "Draft a feed caption first." };
  }

  return generateMetaSocialCaption({
    eventId: input.eventId,
    relativeDay: input.relativeDay,
    milestoneTitle: input.milestoneTitle,
    placement: "story",
    existingFeedCaption: feedCaption,
  });
}

export async function buildMetaSocialCaptionMilestones(
  eventId: string,
): Promise<MetaSocialCaptionMilestone[]> {
  const event = await getEventById(eventId);
  if (!event) {
    return [];
  }

  const milestones = await resolveSocialMetaMilestonesForEvent(eventId);

  if (milestones.length === 0) {
    return [];
  }

  const [captions, artworkByDay] = await Promise.all([
    getMetaSocialCaptionsForEvent(eventId),
    getApprovedFeedArtworkByMilestone(eventId),
  ]);
  const byKey = new Map(
    captions.map((entry) => [`${entry.relativeDay}-${entry.placement}`, entry]),
  );

  return milestones.map((milestone) => {
    const feed = byKey.get(`${milestone.relativeDay}-feed`);
    const story = byKey.get(`${milestone.relativeDay}-story`);

    return {
      relativeDay: milestone.relativeDay,
      title: milestone.title,
      hasApprovedFeedArtwork: artworkByDay.has(milestone.relativeDay),
      feed: {
        id: feed?.id ?? null,
        content: feed?.content ?? null,
        status: feed?.status ?? null,
      },
      story: {
        id: story?.id ?? null,
        content: story?.content ?? null,
        status: story?.status ?? null,
      },
    };
  });
}

export async function generateAllMetaSocialCaptions(
  eventId: string,
): Promise<MetaSocialCaptionActionResult> {
  const milestones = await buildMetaSocialCaptionMilestones(eventId);

  if (milestones.length === 0) {
    return { success: false, error: "No Meta milestones for this event." };
  }

  let generatedCount = 0;

  for (const milestone of milestones) {
    const feedResult = await generateMetaSocialCaption({
      eventId,
      relativeDay: milestone.relativeDay,
      milestoneTitle: milestone.title,
      placement: "feed",
    });

    if (!feedResult.success) {
      return feedResult;
    }
    generatedCount += 1;

    const storyResult = await generateMetaSocialCaption({
      eventId,
      relativeDay: milestone.relativeDay,
      milestoneTitle: milestone.title,
      placement: "story",
      existingFeedCaption: feedResult.content,
    });

    if (!storyResult.success) {
      return storyResult;
    }
    generatedCount += 1;
  }

  return { success: true, generatedCount };
}
