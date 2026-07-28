"use server";

import { revalidatePath } from "next/cache";
import { campaignBuilderHref } from "@/lib/campaign-builder-v2/navigation";
import { getCurrentOrganization } from "@/lib/auth/organization-context";
import { assertOrgCapacity } from "@/lib/billing/gates";
import { countEventsForCapacity } from "@/lib/billing/capacity-usage";
import { insertEvent } from "@/lib/events/mutations";
import { assignPlaybookToEvent } from "@/lib/playbooks/mutations";
import { initializeEventWorkspace } from "@/lib/event-workspace/mutations";

function todayYmd(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Create a minimal campaign event for a custom volunteer opportunity so
 * Create with AI artwork / preview can run against a real event id.
 */
export async function ensureVolunteerOpportunityEventAction(input: {
  title: string;
  description?: string | null;
  date?: string | null;
}): Promise<{
  success: boolean;
  eventId: string | null;
  href: string | null;
  error: string | null;
}> {
  const organization = await getCurrentOrganization();
  if (!organization?.id) {
    return {
      success: false,
      eventId: null,
      href: null,
      error: "Sign in to create artwork for this opportunity.",
    };
  }

  const title = input.title.trim() || "Volunteer opportunity";
  const description =
    input.description?.trim() ||
    "Volunteer opportunity — create artwork for your Volunteer With Us page.";
  const date =
    input.date && /^\d{4}-\d{2}-\d{2}$/.test(input.date)
      ? input.date
      : todayYmd();

  const count = await countEventsForCapacity(organization.id);
  const capacity = await assertOrgCapacity(
    organization.id,
    "eventsPerSchoolYear",
    count,
  );
  if (!capacity.ok) {
    return {
      success: false,
      eventId: null,
      href: null,
      error: `${capacity.message} ${capacity.upgradeHint}`,
    };
  }

  const event = await insertEvent({
    title,
    description,
    date,
    time: null,
    location: null,
    audience: null,
    theme: null,
    status: "draft",
    eventType: "volunteer_drive",
    communicationStrategy: "full_campaign",
  });

  if (!event) {
    return {
      success: false,
      eventId: null,
      href: null,
      error: "Could not create an event for artwork. Try again.",
    };
  }

  await assignPlaybookToEvent(event, undefined, organization.id);
  await initializeEventWorkspace(event);

  revalidatePath("/events");
  revalidatePath("/volunteer-composer");
  revalidatePath("/create-with-ai");

  return {
    success: true,
    eventId: event.id,
    href: campaignBuilderHref(event.id, "preview"),
    error: null,
  };
}
