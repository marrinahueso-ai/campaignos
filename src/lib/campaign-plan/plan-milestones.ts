import { ensureStepCommunicationItemsForEvent } from "@/lib/event-workspace/communication-items";
import { syncMetaPublicationSlots } from "@/lib/meta-publishing/sync-slots";

export async function resyncCampaignPlanDownstream(eventId: string): Promise<void> {
  await ensureStepCommunicationItemsForEvent(eventId);
  await syncMetaPublicationSlots(eventId);
}
