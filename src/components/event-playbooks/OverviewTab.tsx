import Link from "next/link";
import Image from "next/image";
import { CalendarDays, MapPin, Users } from "lucide-react";
import { CommunicationStrategyBadge } from "@/components/events/CommunicationStrategyBadge";
import { OverviewChecklist } from "@/components/event-playbooks/OverviewChecklist";
import { OverviewEventDetailsGrid } from "@/components/event-playbooks/OverviewEventDetailsGrid";
import { OverviewQuickLinksPanel } from "@/components/event-playbooks/OverviewQuickLinksPanel";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { COMMUNICATION_STRATEGY_LABELS } from "@/lib/events/communication-strategy";
import { formatEventDate, formatEventTime } from "@/lib/utils/dates";
import type { EventRosterOwnership } from "@/lib/organization-workspace/resolve-event-roster-ownership";
import type { Event } from "@/types";
import type { EventPlaybookHubData } from "@/types/event-playbooks";

interface OverviewTabProps {
  event: Event;
  ownership: EventRosterOwnership | null;
  hubData: EventPlaybookHubData;
  pastEvents: Event[];
  hasCampaign?: boolean;
  tablesAvailable?: boolean;
  eventId: string;
}

function formatChair(ownership: EventRosterOwnership | null): string {
  if (!ownership?.chairNames.length) {
    return "Unassigned";
  }
  return ownership.chairNames.join(", ");
}

export function OverviewTab({
  event,
  ownership,
  hubData,
  pastEvents,
  hasCampaign = true,
  tablesAvailable = true,
  eventId,
}: OverviewTabProps) {
  const formattedTime = formatEventTime(event.time);
  const attendanceEstimate =
    event.expectedAttendance?.trim() || event.audience?.trim() || "TBD";
  const budgetDisplay = event.budget?.trim() || "Not set";
  const chairDisplay = formatChair(ownership);

  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatMiniCard
          label="Event date"
          value={formatEventDate(event.date)}
          sub={formattedTime ?? undefined}
          icon={CalendarDays}
        />
        <StatMiniCard
          label="Expected attendance"
          value={attendanceEstimate}
          sub="From settings"
          icon={Users}
        />
        <StatMiniCard
          label="Budget"
          value={budgetDisplay}
          sub="From settings"
        />
        <StatMiniCard
          label="Chair"
          value={chairDisplay}
          sub={ownership?.committeeName ?? "Committee not linked"}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-8">
          <Card padding="lg">
            <CardHeader>
              <CardTitle>Event overview</CardTitle>
              <CardDescription>
                {event.description || "Imported from school calendar."}
              </CardDescription>
            </CardHeader>
            <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2 border-b border-cos-border pb-4 text-sm text-cos-dark-muted">
              {event.location && (
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 shrink-0" />
                  {event.location}
                </span>
              )}
              <CommunicationStrategyBadge strategy={event.communicationStrategy} />
              <span>
                Plan: {COMMUNICATION_STRATEGY_LABELS[event.communicationStrategy]}
              </span>
            </div>
            <OverviewEventDetailsGrid event={event} />
            <p className="mt-4 text-xs text-cos-muted">
              <Link href="#settings" className="font-medium text-cos-text hover:underline">
                Edit in Settings →
              </Link>
            </p>
          </Card>

          {event.approvedSquareImageStatus === "filled" &&
            event.approvedSquareImageUrl && (
              <Card padding="lg">
                <CardHeader>
                  <CardTitle>Approved 1:1 image</CardTitle>
                </CardHeader>
                <div className="relative mt-2 aspect-square w-full max-w-[200px] overflow-hidden border border-cos-border">
                  <Image
                    src={event.approvedSquareImageUrl}
                    alt="Approved square image"
                    fill
                    className="object-cover"
                    unoptimized
                  />
                </div>
              </Card>
            )}

          <Card padding="lg">
            <OverviewChecklist
              eventId={eventId}
              tasks={hubData.tasks}
              taskGroups={hubData.taskGroups}
              planningProgressPercent={hubData.planningProgressPercent}
              tablesAvailable={tablesAvailable}
            />
          </Card>

          <Card padding="lg">
            <CardHeader>
              <CardTitle>At a glance — history</CardTitle>
              <CardDescription>
                Past occurrences of this event type for reference.
              </CardDescription>
            </CardHeader>
            {pastEvents.length > 0 ? (
              <ul className="mt-4 space-y-3">
                {pastEvents.map((past) => (
                  <li
                    key={past.id}
                    className="flex items-center justify-between gap-4 border border-cos-border bg-cos-bg-alt px-4 py-3 text-sm"
                  >
                    <div>
                      <p className="font-medium text-cos-text">{past.title}</p>
                      <p className="text-cos-muted">{formatEventDate(past.date)}</p>
                    </div>
                    <Link
                      href={`/events/${past.id}`}
                      className="text-xs font-medium text-cos-accent hover:underline"
                    >
                      View hub
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-sm text-cos-muted">
                No prior events of this type yet. History will appear after your first
                occurrence.
              </p>
            )}
          </Card>
        </div>

        <aside className="space-y-6 lg:col-span-4">
          <Card padding="lg">
            <CardHeader>
              <CardTitle>Quick links</CardTitle>
            </CardHeader>
            <OverviewQuickLinksPanel event={event} hasCampaign={hasCampaign} />
          </Card>

          <Card padding="lg">
            <CardHeader>
              <CardTitle>Recent activity</CardTitle>
            </CardHeader>
            {hubData.activity.length > 0 ? (
              <ul className="mt-2 divide-y divide-cos-border border-t border-cos-border">
                {hubData.activity.slice(0, 8).map((item) => (
                  <li key={item.id} className="py-3 text-sm first:pt-0">
                    <p className="font-medium text-cos-text">{item.action}</p>
                    <p className="mt-0.5 text-xs text-cos-dark-muted">
                      {item.actorName ?? "Someone"} ·{" "}
                      {new Date(item.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-cos-muted">
                Activity from tasks and notes will show up here.
              </p>
            )}
          </Card>
        </aside>
      </div>
    </div>
  );
}

function StatMiniCard({
  label,
  value,
  sub,
  icon: Icon,
}: {
  label: string;
  value: string;
  sub?: string;
  icon?: React.ComponentType<{ className?: string; strokeWidth?: number }>;
}) {
  return (
    <div className="border border-cos-border bg-cos-card p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <p className="cos-section-title">{label}</p>
        {Icon && <Icon className="h-4 w-4 text-cos-dark-muted" strokeWidth={1.5} />}
      </div>
      <p className="font-display mt-2 text-xl text-cos-text">{value}</p>
      {sub && <p className="mt-1 text-xs text-cos-dark-muted">{sub}</p>}
    </div>
  );
}
