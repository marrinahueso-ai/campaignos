import { createClient } from "@/lib/supabase/server";
import { mapMetaSocialCaptionRow } from "@/lib/meta-captions/mappers";
import type {
  MetaSocialCaption,
  MetaSocialCaptionPlacement,
  MetaSocialCaptionRow,
  MetaSocialCaptionStatus,
} from "@/lib/meta-captions/types";

function isMissingTable(error: { code?: string; message?: string } | null): boolean {
  return error?.code === "42P01";
}

export async function getMetaSocialCaptionsForEvent(
  eventId: string,
): Promise<MetaSocialCaption[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("meta_social_captions")
    .select("*")
    .eq("event_id", eventId)
    .order("relative_day", { ascending: true });

  if (error) {
    if (isMissingTable(error)) {
      return [];
    }
    console.error("Failed to fetch meta social captions:", error.message);
    return [];
  }

  return ((data ?? []) as MetaSocialCaptionRow[]).map(mapMetaSocialCaptionRow);
}

export async function upsertMetaSocialCaption(input: {
  eventId: string;
  relativeDay: number;
  milestoneTitle: string;
  placement: MetaSocialCaptionPlacement;
  content: string;
  status?: MetaSocialCaptionStatus;
}): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const now = new Date().toISOString();
  const status = input.status ?? "draft";

  const { data: existing, error: lookupError } = await supabase
    .from("meta_social_captions")
    .select("id")
    .eq("event_id", input.eventId)
    .eq("relative_day", input.relativeDay)
    .eq("placement", input.placement)
    .maybeSingle();

  if (lookupError) {
    if (isMissingTable(lookupError)) {
      return { success: false, error: "Caption storage is not set up yet. Run database migrations." };
    }
    console.error("Failed to look up meta social caption:", lookupError.message);
    return { success: false, error: lookupError.message };
  }

  if (existing?.id) {
    const { error } = await supabase
      .from("meta_social_captions")
      .update({
        milestone_title: input.milestoneTitle,
        content: input.content,
        status,
        updated_at: now,
      })
      .eq("id", existing.id);

    if (error) {
      if (isMissingTable(error)) {
        return { success: false, error: "Caption storage is not set up yet. Run database migrations." };
      }
      console.error("Failed to update meta social caption:", error.message);
      return { success: false, error: error.message };
    }

    return { success: true };
  }

  const { error } = await supabase.from("meta_social_captions").insert({
    event_id: input.eventId,
    relative_day: input.relativeDay,
    milestone_title: input.milestoneTitle,
    placement: input.placement,
    content: input.content,
    status,
    updated_at: now,
  });

  if (error) {
    if (isMissingTable(error)) {
      return { success: false, error: "Caption storage is not set up yet. Run database migrations." };
    }
    console.error("Failed to insert meta social caption:", error.message);
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function updateMetaSocialCaptionStatus(input: {
  eventId: string;
  relativeDay: number;
  placement: MetaSocialCaptionPlacement;
  status: MetaSocialCaptionStatus;
}): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const now = new Date().toISOString();

  const { error } = await supabase
    .from("meta_social_captions")
    .update({ status: input.status, updated_at: now })
    .eq("event_id", input.eventId)
    .eq("relative_day", input.relativeDay)
    .eq("placement", input.placement);

  if (error) {
    if (isMissingTable(error)) {
      return { success: false, error: "Caption storage is not set up yet. Run database migrations." };
    }
    console.error("Failed to update meta social caption status:", error.message);
    return { success: false, error: error.message };
  }

  return { success: true };
}

export function getCaptionForMilestone(
  captions: MetaSocialCaption[],
  relativeDay: number,
  placement: MetaSocialCaptionPlacement,
): MetaSocialCaption | null {
  return (
    captions.find(
      (caption) => caption.relativeDay === relativeDay && caption.placement === placement,
    ) ?? null
  );
}

export function getFeedCaptionForMilestone(
  captions: MetaSocialCaption[],
  relativeDay: number,
): string | null {
  return getCaptionForMilestone(captions, relativeDay, "feed")?.content ?? null;
}

export function getStoryCaptionForMilestone(
  captions: MetaSocialCaption[],
  relativeDay: number,
): string | null {
  return getCaptionForMilestone(captions, relativeDay, "story")?.content ?? null;
}

export function isMilestoneCaptionsApproved(
  captions: MetaSocialCaption[],
  relativeDay: number,
): boolean {
  const feed = getCaptionForMilestone(captions, relativeDay, "feed");
  const story = getCaptionForMilestone(captions, relativeDay, "story");

  return (
    Boolean(feed?.content?.trim()) &&
    feed?.status === "approved" &&
    Boolean(story?.content?.trim()) &&
    story?.status === "approved"
  );
}
