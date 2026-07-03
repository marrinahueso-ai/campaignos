import Link from "next/link";
import { Settings, Users } from "lucide-react";
import { EventOwnershipStrip } from "@/components/events/EventOwnershipStrip";
import { EventPlanningSettingsPanel } from "@/components/event-playbooks/EventPlanningSettingsPanel";
import { Button } from "@/components/ui/Button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import type { EventRosterOwnership } from "@/lib/organization-workspace/resolve-event-roster-ownership";
import type { Event } from "@/types";

interface SettingsTabProps {
  event: Event;
  ownership: EventRosterOwnership | null;
  hasCampaign?: boolean;
  calendarExtras?: React.ReactNode;
}

export function SettingsTab({
  event,
  ownership,
  hasCampaign = true,
  calendarExtras,
}: SettingsTabProps) {
  return (
    <div className="space-y-6">
      <Card padding="lg">
        <CardHeader>
          <CardTitle>Committee & ownership</CardTitle>
          <CardDescription>
            Chairs and VPs are configured in organization settings and matched to events
            by committee name or event type.
          </CardDescription>
        </CardHeader>
        {ownership ? (
          <div className="mt-4">
            <EventOwnershipStrip ownership={ownership} />
          </div>
        ) : (
          <p className="mt-4 text-sm text-cos-muted">
            No committee data available. Set up committees in organization settings.
          </p>
        )}
        <Button
          href="/settings/organization"
          variant="secondary"
          size="sm"
          className="mt-6"
        >
          <Users className="h-4 w-4" />
          Manage committees & VPs
        </Button>
      </Card>

      <EventPlanningSettingsPanel event={event} />

      {calendarExtras}

      <Card padding="lg">
        <CardHeader>
          <CardTitle>Calendar & campaigns</CardTitle>
          <CardDescription>
            This event appears on the school calendar
            {hasCampaign ? " with an active communication campaign." : "."}
          </CardDescription>
        </CardHeader>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            href="/calendar"
            className="inline-flex items-center gap-2 border border-cos-border bg-cos-bg px-4 py-2 text-sm text-cos-text hover:bg-cos-card"
          >
            <Settings className="h-4 w-4" />
            View on calendar
          </Link>
          <Link
            href="/events"
            className="inline-flex items-center gap-2 border border-cos-border bg-cos-bg px-4 py-2 text-sm text-cos-text hover:bg-cos-card"
          >
            All campaigns
          </Link>
          {hasCampaign && (
            <Link
              href="#social-media"
              className="inline-flex items-center gap-2 border border-cos-border bg-cos-bg px-4 py-2 text-sm text-cos-text hover:bg-cos-card"
            >
              Social media workspace
            </Link>
          )}
        </div>
      </Card>
    </div>
  );
}
