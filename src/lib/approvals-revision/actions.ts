"use server";

import { revalidatePath } from "next/cache";
import {
  regenerateArtworkAction,
  regenerateCaptionAction,
  regenerateMilestoneArtworkAction,
} from "@/lib/campaign-builder-v2/actions";
import { brandKitIdForAi } from "@/lib/campaign-builder-v2/brand-kit";
import { getSharedCaptionText } from "@/lib/campaign-builder-v2/caption-utils";
import { syncCampaignBuilderMilestoneArtwork } from "@/lib/campaign-builder-v2/hero-sync";
import { resolvePersistedScheduleAt } from "@/lib/campaign-builder-v2/schedule-meta-from-approval";
import { saveCampaignBuilderSessionAction } from "@/lib/campaign-builder-v2/session";
import { loadCampaignBuilderSession } from "@/lib/campaign-builder-v2/session-queries";
import type { ApprovalSchedulingItemRow } from "@/lib/approvals-scheduling/types";
import {
  patchPreviewFromRevision,
  scheduleAtFromPreview,
  snapshotFromSchedulingRow,
} from "@/lib/approvals-revision/sync-revision-snapshot";
import { createClient } from "@/lib/supabase/server";
import type {
  CampaignBuilderMilestone,
  CampaignBuilderSession,
  MilestonePreviewContent,
} from "@/lib/campaign-builder-v2/types";

export type RevisionActionResult = {
  success: boolean;
  error?: string;
  message?: string;
};

export type RevisionRegenerateArtworkResult = RevisionActionResult & {
  feedArtworkUrl?: string | null;
  storyArtworkUrl?: string | null;
};

export type RevisionRegenerateCaptionResult = RevisionActionResult & {
  captionText?: string;
  storyCaption?: string | null;
};

export type RevisionUpdateScheduleResult = RevisionActionResult & {
  scheduleAt?: string | null;
  scheduleLabel?: string | null;
};

type RevisionContext = {
  session: CampaignBuilderSession;
  previewIndex: number;
  milestone: CampaignBuilderMilestone;
  schedulingRow: ApprovalSchedulingItemRow;
};

async function loadSchedulingItemForRevision(
  schedulingItemId: string,
): Promise<ApprovalSchedulingItemRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("approval_scheduling_items")
    .select("*")
    .eq("id", schedulingItemId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data as ApprovalSchedulingItemRow;
}

async function loadRevisionContext(input: {
  eventId: string;
  campaignMilestoneId: string;
  schedulingItemId: string;
}): Promise<{ context: RevisionContext } | { error: string }> {
  const schedulingRow = await loadSchedulingItemForRevision(
    input.schedulingItemId,
  );

  if (!schedulingRow) {
    return { error: "Couldn't find that approval item." };
  }

  if (schedulingRow.event_id !== input.eventId) {
    return { error: "That approval doesn't match this event." };
  }

  if (schedulingRow.workflow_status !== "changes_requested") {
    return { error: "This item isn't waiting on edits anymore." };
  }

  if (schedulingRow.campaign_milestone_id !== input.campaignMilestoneId) {
    return { error: "That milestone doesn't match this approval item." };
  }

  const session = await loadCampaignBuilderSession(input.eventId);
  if (!session) {
    return {
      error:
        "Create with AI session not found. Open the campaign builder once, then try again.",
    };
  }

  const previewIndex = session.previewContents.findIndex(
    (entry) => entry.milestoneId === input.campaignMilestoneId,
  );
  if (previewIndex < 0) {
    return { error: "Couldn't find milestone preview content." };
  }

  const milestone = session.milestones.find(
    (entry) => entry.id === input.campaignMilestoneId,
  );
  if (!milestone) {
    return { error: "Couldn't find that milestone." };
  }

  return {
    context: {
      session,
      previewIndex,
      milestone,
      schedulingRow,
    },
  };
}

async function persistRevisionPreview(input: {
  context: RevisionContext;
  previewPatch?: Parameters<typeof patchPreviewFromRevision>[0]["snapshot"];
  scheduleDate?: string;
  scheduleTime?: string;
}): Promise<{ preview: MilestonePreviewContent }> {
  const { context } = input;
  const currentPreview = context.session.previewContents[context.previewIndex]!;
  const preview = patchPreviewFromRevision({
    preview: currentPreview,
    snapshot: input.previewPatch ?? {},
    scheduleDate: input.scheduleDate,
    scheduleTime: input.scheduleTime,
  });

  const previewContents = [...context.session.previewContents];
  previewContents[context.previewIndex] = preview;

  await saveCampaignBuilderSessionAction({
    ...context.session,
    previewContents,
  });

  const scheduleAt =
    input.previewPatch?.scheduleAt ??
    scheduleAtFromPreview(preview) ??
    resolvePersistedScheduleAt(preview);

  const captionText =
    input.previewPatch?.captionText ?? getSharedCaptionText(preview.captions);
  const storyCaption =
    input.previewPatch?.storyCaption ??
    preview.captions.find((entry) => entry.platform === "instagram")?.text ??
    null;

  const supabase = await createClient();
  await supabase
    .from("approval_scheduling_items")
    .update({
      feed_artwork_url: preview.artwork.feedUrl,
      story_artwork_url: preview.artwork.storyUrl,
      caption_text: captionText || null,
      story_caption: storyCaption?.trim() || null,
      schedule_at: scheduleAt,
      updated_at: new Date().toISOString(),
    })
    .eq("id", context.schedulingRow.id);

  if (preview.artwork.feedUrl || preview.artwork.storyUrl) {
    await syncCampaignBuilderMilestoneArtwork({
      eventId: context.session.eventId,
      milestones: context.session.milestones,
      milestoneId: context.milestone.id,
      artwork: preview.artwork,
      options: { revalidate: false },
    });
  }

  revalidatePath("/approvals");
  revalidatePath("/approvals/revision");
  revalidatePath(`/events/${context.session.eventId}/campaign-builder`);

  return { preview };
}

export type RevisionArtworkView = "feed" | "story" | "both";

export async function regenerateRevisionArtworkAction(input: {
  eventId: string;
  campaignMilestoneId: string;
  schedulingItemId: string;
  instructions: string;
  /** Default `both` — regenerate all enabled formats via milestone path. */
  view?: RevisionArtworkView;
}): Promise<RevisionRegenerateArtworkResult> {
  const loaded = await loadRevisionContext(input);
  if ("error" in loaded) {
    return { success: false, error: loaded.error };
  }

  const { context } = loaded;
  const preview = context.session.previewContents[context.previewIndex]!;
  const brandKitId = brandKitIdForAi(context.session.inspiration.brandKitId);
  const view = input.view ?? "both";

  if (view === "feed" || view === "story") {
    const currentImageUrl =
      view === "feed"
        ? preview.artwork.feedUrl?.trim() || null
        : preview.artwork.storyUrl?.trim() || null;

    const result = await regenerateArtworkAction({
      eventId: input.eventId,
      milestoneId: input.campaignMilestoneId,
      view,
      instructions: input.instructions,
      styleStrength: 50,
      brandKitId,
      useBrandKit: brandKitId !== null,
      inspiration: context.session.inspiration,
      milestone: context.milestone,
      currentImageUrl,
    });

    if (!result.success) {
      return {
        success: false,
        error: result.message || "Artwork regeneration failed.",
      };
    }

    const nextUrl = result.variationUrls[0]?.trim() || null;
    if (!nextUrl) {
      return {
        success: false,
        error: result.message || "Artwork regeneration returned no image.",
      };
    }

    const persisted = await persistRevisionPreview({
      context,
      previewPatch:
        view === "feed"
          ? { feedArtworkUrl: nextUrl }
          : { storyArtworkUrl: nextUrl },
    });

    return {
      success: true,
      message: result.message || `${view === "feed" ? "Feed" : "Story"} artwork regenerated.`,
      feedArtworkUrl: persisted.preview.artwork.feedUrl,
      storyArtworkUrl: persisted.preview.artwork.storyUrl,
    };
  }

  const result = await regenerateMilestoneArtworkAction({
    eventId: input.eventId,
    milestoneId: input.campaignMilestoneId,
    instructions: input.instructions,
    styleStrength: 50,
    brandKitId,
    useBrandKit: brandKitId !== null,
    inspiration: context.session.inspiration,
    milestone: context.milestone,
    milestones: context.session.milestones,
    previewContent: preview,
  });

  if (!result.success) {
    return {
      success: false,
      error: result.message || "Artwork regeneration failed.",
    };
  }

  const persisted = await persistRevisionPreview({
    context,
    previewPatch: {
      feedArtworkUrl: result.artwork.feedUrl ?? null,
      storyArtworkUrl: result.artwork.storyUrl ?? null,
    },
  });

  return {
    success: true,
    message: result.message || "Artwork regenerated.",
    feedArtworkUrl: persisted.preview.artwork.feedUrl,
    storyArtworkUrl: persisted.preview.artwork.storyUrl,
  };
}

export async function regenerateRevisionCaptionAction(input: {
  eventId: string;
  campaignMilestoneId: string;
  schedulingItemId: string;
  instructions: string;
}): Promise<RevisionRegenerateCaptionResult> {
  const loaded = await loadRevisionContext(input);
  if ("error" in loaded) {
    return { success: false, error: loaded.error };
  }

  const { context } = loaded;
  const preview = context.session.previewContents[context.previewIndex]!;
  const currentCaption = getSharedCaptionText(preview.captions);
  const artworkImageUrl =
    preview.artwork.feedUrl?.trim() ||
    preview.artwork.storyUrl?.trim() ||
    snapshotFromSchedulingRow(context.schedulingRow).feedArtworkUrl;

  const result = await regenerateCaptionAction({
    eventId: input.eventId,
    milestoneId: input.campaignMilestoneId,
    platform: context.milestone.platforms[0] ?? "facebook",
    instructions: input.instructions,
    tone: context.session.inspiration.voiceTone || "Campaign default",
    currentCaption,
    inspiration: context.session.inspiration,
    milestone: context.milestone,
    artworkImageUrl,
    playbookName: null,
  });

  if (!result.success) {
    return {
      success: false,
      error: result.message || "Caption regeneration failed.",
    };
  }

  const persisted = await persistRevisionPreview({
    context,
    previewPatch: {
      captionText: result.caption,
      storyCaption: result.caption,
    },
  });

  const captionText = getSharedCaptionText(persisted.preview.captions);

  return {
    success: true,
    message: result.message || "Caption regenerated.",
    captionText,
    storyCaption:
      persisted.preview.captions.find((entry) => entry.platform === "instagram")
        ?.text ?? captionText,
  };
}

export async function updateRevisionScheduleAction(input: {
  eventId: string;
  campaignMilestoneId: string;
  schedulingItemId: string;
  scheduleDate: string;
  scheduleTime: string;
}): Promise<RevisionUpdateScheduleResult> {
  const loaded = await loadRevisionContext(input);
  if ("error" in loaded) {
    return { success: false, error: loaded.error };
  }

  const scheduleAt = scheduleAtFromPreview({
    ...loaded.context.session.previewContents[loaded.context.previewIndex]!,
    scheduleDate: input.scheduleDate,
    scheduleTime: input.scheduleTime,
  });

  if (!scheduleAt) {
    return { success: false, error: "Enter a valid date and time." };
  }

  await persistRevisionPreview({
    context: loaded.context,
    scheduleDate: input.scheduleDate,
    scheduleTime: input.scheduleTime,
    previewPatch: { scheduleAt },
  });

  const label = new Date(scheduleAt).toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  return {
    success: true,
    message: "Schedule updated.",
    scheduleAt,
    scheduleLabel: label,
  };
}
