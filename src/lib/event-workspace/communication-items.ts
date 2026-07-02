import { createClient } from "@/lib/supabase/server";
import { getEventPlaybookData } from "@/lib/playbooks/queries";
import { isPersistableStepId } from "@/lib/communications-brain/generator";
import type {
  CommunicationChannel,
  CommunicationItemRow,
} from "@/types/event-workspace";

export function isHubCommunicationItem(item: CommunicationItemRow): boolean {
  return item.event_communication_step_id === null;
}

export function isStepCommunicationItem(item: CommunicationItemRow): boolean {
  return item.event_communication_step_id !== null;
}

export function getHubCommunicationItems(
  items: CommunicationItemRow[],
): CommunicationItemRow[] {
  return items.filter(isHubCommunicationItem);
}

export function buildCommunicationItemsByStepId(
  items: CommunicationItemRow[],
): Map<string, CommunicationItemRow> {
  const map = new Map<string, CommunicationItemRow>();

  for (const item of items) {
    if (!item.event_communication_step_id) {
      continue;
    }
    map.set(item.event_communication_step_id, item);
  }

  return map;
}

export async function findCommunicationItemForStep(
  stepId: string,
): Promise<string | null> {
  const supabase = await createClient();

  const { data: item, error } = await supabase
    .from("communication_items")
    .select("id")
    .eq("event_communication_step_id", stepId)
    .maybeSingle();

  if (error) {
    console.error("Failed to look up step communication item:", error.message);
    return null;
  }

  return (item?.id as string | undefined) ?? null;
}

export async function ensureCommunicationItemForStep(
  eventId: string,
  stepId: string,
  channel: CommunicationChannel,
): Promise<string | null> {
  if (!isPersistableStepId(stepId)) {
    return null;
  }

  const existing = await findCommunicationItemForStep(stepId);
  if (existing) {
    return existing;
  }

  const supabase = await createClient();
  const now = new Date().toISOString();

  const { data: inserted, error } = await supabase
    .from("communication_items")
    .insert({
      event_id: eventId,
      channel,
      event_communication_step_id: stepId,
      status: "draft",
      last_updated: now,
      is_published: false,
    })
    .select("id")
    .maybeSingle();

  if (!error && inserted?.id) {
    console.info("✓ Step communication item created", {
      eventId,
      stepId,
      channel,
      communicationItemId: inserted.id,
    });
    return inserted.id as string;
  }

  if (error) {
    console.error("Failed to create step communication item:", error.message);
  }

  return findCommunicationItemForStep(stepId);
}

export async function findHubCommunicationItemForChannel(
  eventId: string,
  channel: CommunicationChannel,
): Promise<string | null> {
  const supabase = await createClient();

  const { data: item, error } = await supabase
    .from("communication_items")
    .select("id")
    .eq("event_id", eventId)
    .eq("channel", channel)
    .is("event_communication_step_id", null)
    .maybeSingle();

  if (error) {
    console.error("Failed to look up hub communication item:", error.message);
    return null;
  }

  return (item?.id as string | undefined) ?? null;
}

export async function ensureHubCommunicationItemForChannel(
  eventId: string,
  channel: CommunicationChannel,
): Promise<string | null> {
  const existing = await findHubCommunicationItemForChannel(eventId, channel);
  if (existing) {
    return existing;
  }

  const supabase = await createClient();
  const now = new Date().toISOString();

  const { data: inserted, error } = await supabase
    .from("communication_items")
    .insert({
      event_id: eventId,
      channel,
      status: "draft",
      last_updated: now,
      is_published: false,
    })
    .select("id")
    .maybeSingle();

  if (!error && inserted?.id) {
    return inserted.id as string;
  }

  if (error) {
    console.error("Failed to create hub communication item:", error.message);
  }

  return findHubCommunicationItemForChannel(eventId, channel);
}

export async function ensureStepCommunicationItemsForEvent(
  eventId: string,
): Promise<number> {
  const playbookData = await getEventPlaybookData(eventId);
  if (!playbookData?.steps.length) {
    return 0;
  }

  let ensured = 0;

  for (const step of playbookData.steps) {
    if (!isPersistableStepId(step.id)) {
      continue;
    }

    const itemId = await ensureCommunicationItemForStep(
      eventId,
      step.id,
      step.channel,
    );

    if (itemId) {
      ensured += 1;
    }
  }

  return ensured;
}

export async function getStepCommunicationItemRowsForEvent(
  eventId: string,
): Promise<CommunicationItemRow[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("communication_items")
    .select("*")
    .eq("event_id", eventId)
    .not("event_communication_step_id", "is", null);

  if (error) {
    console.error("Failed to load step communication items:", error.message);
    return [];
  }

  return (data ?? []) as CommunicationItemRow[];
}
