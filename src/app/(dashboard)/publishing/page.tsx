import { getPlanningCalendarData } from "@/lib/communications-calendar/planning-queries";
import type { PlanningCalendarItem } from "@/types/communications-calendar";
import { PublishingHub } from "@/components/publishing/PublishingHub";

export const metadata = {
  title: "Publishing",
};

function isMetaMilestone(item: PlanningCalendarItem): boolean {
  return item.communicationType === "meta_milestone";
}

function isPublished(item: PlanningCalendarItem): boolean {
  return item.publishStatus === "published" || item.status === "published";
}

export default async function PublishingPage() {
  const { items } = await getPlanningCalendarData();
  const metaItems = items.filter(isMetaMilestone);
  const today = new Date().toISOString().slice(0, 10);

  const published = metaItems.filter(isPublished);
  const scheduled = metaItems.filter(
    (item) => !isPublished(item) && item.scheduledDate > today,
  );
  const queue = metaItems.filter(
    (item) => !isPublished(item) && item.scheduledDate <= today,
  );

  return (
    <PublishingHub
      queue={queue}
      scheduled={scheduled}
      published={published}
      today={today}
    />
  );
}
