import {
  BarChart3,
  CircleDollarSign,
  MapPin,
  Tag,
  Target,
  Users,
} from "lucide-react";
import { EVENT_TYPE_LABELS, DEFAULT_EVENT_TYPE } from "@/lib/playbooks/constants";
import type { Event } from "@/types";

interface OverviewEventDetailsGridProps {
  event: Event;
}

export function OverviewEventDetailsGrid({ event }: OverviewEventDetailsGridProps) {
  const eventTypeLabel =
    EVENT_TYPE_LABELS[event.eventType ?? DEFAULT_EVENT_TYPE] ?? "General Event";

  const rows = [
    { icon: Target, label: "Goal", value: event.goal?.trim() || "Not set" },
    { icon: Users, label: "Audience", value: event.audience?.trim() || "Not set" },
    { icon: MapPin, label: "Location", value: event.location?.trim() || "Not set" },
    {
      icon: BarChart3,
      label: "Expected attendance",
      value: event.expectedAttendance?.trim() || event.audience?.trim() || "TBD",
    },
    { icon: CircleDollarSign, label: "Budget", value: event.budget?.trim() || "Not set" },
    { icon: Tag, label: "Event type", value: eventTypeLabel },
  ];

  return (
    <div className="mt-6 grid gap-4 sm:grid-cols-2">
      {rows.map(({ icon: Icon, label, value }) => (
        <div key={label} className="flex gap-3">
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-cos-bg text-cos-muted">
            <Icon className="h-4 w-4" strokeWidth={1.5} />
          </span>
          <div>
            <p className="text-xs font-medium tracking-wide text-cos-muted uppercase">
              {label}
            </p>
            <p className="mt-1 text-sm text-cos-text">{value}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
