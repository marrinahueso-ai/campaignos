import { CalendarDays, Settings2 } from "lucide-react";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { CommunicationStrategyBadge } from "@/components/events/CommunicationStrategyBadge";
import type { CommunicationStrategy } from "@/types/communication-strategy";

interface CommunicationStrategyPanelProps {
  strategy: CommunicationStrategy;
}

export function CommunicationStrategyPanel({
  strategy,
}: CommunicationStrategyPanelProps) {
  if (strategy === "calendar_only") {
    return (
      <Card className="border-cos-border bg-gradient-to-br from-cos-bg to-white">
        <CardHeader className="items-center py-12 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-cos-bg-alt">
            <CalendarDays className="h-7 w-7 text-cos-muted" />
          </div>
          <CommunicationStrategyBadge strategy={strategy} className="mt-4" />
          <CardTitle className="mt-4 text-xl">
            This event is calendar-only. No campaign is needed.
          </CardTitle>
          <CardDescription className="mx-auto mt-2 max-w-lg text-base">
            It appears on your calendar and events list for visibility. No playbook,
            communication timeline, or drafts will be created.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="border-cos-border bg-gradient-to-br from-cos-accent-soft/40 to-white">
      <CardHeader className="items-center py-12 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-cos-accent-soft">
          <Settings2 className="h-7 w-7 text-cos-accent" />
        </div>
        <CommunicationStrategyBadge strategy={strategy} className="mt-4" />
        <CardTitle className="mt-4 text-xl">
          Custom communication strategy
        </CardTitle>
        <CardDescription className="mx-auto max-w-lg text-base">
          Channel selection and countdown configuration are coming soon. This event
          will not receive an auto-generated campaign until custom strategy setup is
          available.
        </CardDescription>
      </CardHeader>
    </Card>
  );
}
