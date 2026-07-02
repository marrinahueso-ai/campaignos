import { CalendarClock } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { CHANNEL_LABELS } from "@/lib/playbooks/constants";
import { getUpcomingSteps } from "@/lib/playbooks/health";
import { formatEventDate, getTodayDateString } from "@/lib/utils/dates";
import type { EventCommunicationStep } from "@/types/playbooks";

interface UpcomingCommunicationsSectionProps {
  steps: EventCommunicationStep[];
}

export function UpcomingCommunicationsSection({
  steps,
}: UpcomingCommunicationsSectionProps) {
  const upcoming = getUpcomingSteps(steps, 5);
  const today = getTodayDateString();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upcoming sends</CardTitle>
        <CardDescription>
          What&apos;s next on your communication timeline.
        </CardDescription>
      </CardHeader>

      {upcoming.length === 0 ? (
        <EmptyState
          icon={CalendarClock}
          title="You're all caught up"
          description="Every required message on this timeline is complete or can wait."
        />
      ) : (
        <ul className="divide-y divide-cos-border">
          {upcoming.map((step) => (
            <li
              key={step.id}
              className="flex flex-col gap-2 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-medium text-cos-text">{step.title}</p>
                <p className="mt-1 text-sm text-cos-muted">
                  {CHANNEL_LABELS[step.channel]} · {formatEventDate(step.dueDate)}
                </p>
              </div>
              <Badge variant={step.dueDate === today ? "warning" : "info"}>
                {step.dueDate === today ? "Due today" : "Coming up"}
              </Badge>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
