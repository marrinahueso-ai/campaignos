import { createClient } from "@/lib/supabase/server";
import { displayDraftContent } from "@/lib/ai/content";
import { buildCommunicationItemsByStepId } from "@/lib/event-workspace/communication-items";
import { mapLatestContentByItemId } from "@/lib/event-workspace/mappers";
import type {
  CommunicationItemRow,
  CommunicationVersionRow,
  StepCommunicationDraft,
} from "@/types/event-workspace";

export async function getStepDraftsForEvent(
  eventId: string,
): Promise<StepCommunicationDraft[]> {
  const supabase = await createClient();

  const [{ data: steps, error: stepsError }, { data: items, error: itemsError }] =
    await Promise.all([
      supabase.from("event_communication_steps").select("*").eq("event_id", eventId),
      supabase
        .from("communication_items")
        .select("*")
        .eq("event_id", eventId)
        .not("event_communication_step_id", "is", null),
    ]);

  if (
    stepsError?.code === "42P01" ||
    itemsError?.code === "42P01" ||
    !steps?.length
  ) {
    return [];
  }

  const itemRows = (items ?? []) as CommunicationItemRow[];
  const itemsByStepId = buildCommunicationItemsByStepId(itemRows);
  const itemIds = itemRows.map((row) => row.id);

  if (itemIds.length === 0) {
    return [];
  }

  const { data: versions } = await supabase
    .from("communication_versions")
    .select("*")
    .in("communication_item_id", itemIds)
    .order("version_number", { ascending: false });

  const contentMap = mapLatestContentByItemId(
    (versions ?? []) as CommunicationVersionRow[],
  );

  const versionNumbers = new Map<string, number>();
  for (const version of (versions ?? []) as CommunicationVersionRow[]) {
    const existing = versionNumbers.get(version.communication_item_id);
    if (!existing || version.version_number > existing) {
      versionNumbers.set(version.communication_item_id, version.version_number);
    }
  }

  const drafts: StepCommunicationDraft[] = [];

  for (const step of steps) {
    const stepId = step.id as string;
    const item = itemsByStepId.get(stepId);
    if (!item) {
      continue;
    }

    const rawContent = contentMap.get(item.id) ?? "";
    const content = displayDraftContent(rawContent);
    if (!content) {
      continue;
    }

    drafts.push({
      communicationItemId: item.id,
      eventId: item.event_id,
      stepId,
      channel: item.channel,
      stepTitle: (step.title as string) ?? stepId,
      dueDate: (step.due_date as string) ?? "",
      content,
      status: item.status,
      versionNumber: versionNumbers.get(item.id) ?? 1,
      lastUpdated: item.last_updated,
    });
  }

  return drafts;
}

export async function getStepDraftByStepId(
  stepId: string,
): Promise<StepCommunicationDraft | null> {
  const supabase = await createClient();

  const { data: step, error: stepError } = await supabase
    .from("event_communication_steps")
    .select("id, event_id, title, due_date, channel")
    .eq("id", stepId)
    .maybeSingle();

  if (stepError || !step) {
    return null;
  }

  const { data: item, error: itemError } = await supabase
    .from("communication_items")
    .select("*")
    .eq("event_communication_step_id", stepId)
    .maybeSingle();

  if (itemError || !item) {
    return null;
  }

  const row = item as CommunicationItemRow;

  const { data: version } = await supabase
    .from("communication_versions")
    .select("*")
    .eq("communication_item_id", row.id)
    .order("version_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  const rawContent = (version as CommunicationVersionRow | null)?.content ?? "";
  const content = displayDraftContent(rawContent);
  if (!content) {
    return null;
  }

  return {
    communicationItemId: row.id,
    eventId: row.event_id,
    stepId,
    channel: row.channel,
    stepTitle: (step.title as string) ?? "",
    dueDate: (step.due_date as string) ?? "",
    content,
    status: row.status,
    versionNumber: (version as CommunicationVersionRow | null)?.version_number ?? 1,
    lastUpdated: row.last_updated,
  };
}
