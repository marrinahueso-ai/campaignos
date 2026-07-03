import { revalidatePath } from "next/cache";

/** Refresh event workspace and surfaces that read event title/details. */
export function revalidateEventPaths(eventId: string): void {
  revalidatePath(`/events/${eventId}`);
  revalidatePath("/dashboard");
  revalidatePath("/events");
  revalidatePath("/campaigns");
  revalidatePath("/calendar");
  revalidatePath("/communications/calendar");
  revalidatePath("/approvals");
}
