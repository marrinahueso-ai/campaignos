"use client";

import { ExternalLink, UserCheck, UserPlus, Users } from "lucide-react";
import { EditEventDetailsButton } from "@/components/event-workspace/EditEventDetailsButton";
import { Button } from "@/components/ui/Button";
import { parseVolunteerStats } from "@/lib/event-playbooks/planning-hub-utils";
import type { Event } from "@/types";

interface EventVolunteersTabProps {
  event: Event;
}

export function EventVolunteersTab({ event }: EventVolunteersTabProps) {
  const signupUrl = event.planningQuickLinks?.volunteer_signup?.url?.trim();
  const needs = event.volunteerNeeds?.trim() || null;
  const stats = parseVolunteerStats(event);
  const hasVolunteerPlan = Boolean(signupUrl || needs);

  return (
    <section className="rounded-xl border border-cos-border bg-white p-4 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-xl text-cos-text">Volunteers</h2>
          <p className="mt-1 text-sm text-cos-muted">
            Volunteer needs and signup details for this event.
          </p>
        </div>
        <EditEventDetailsButton event={event} size="sm" />
      </div>

      {!hasVolunteerPlan ? (
        <div className="mt-6 rounded-xl border-2 border-dashed border-cos-border bg-cos-card px-4 py-10 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-cos-bg">
            <Users className="h-6 w-6 text-cos-muted" strokeWidth={1.5} />
          </div>
          <p className="mt-3 text-sm font-semibold text-cos-text">
            No volunteer plan yet
          </p>
          <p className="mt-1 text-sm text-cos-muted">
            Add volunteer needs or a signup link in Edit Event.
          </p>
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {needs ? (
            <div className="rounded-xl border border-cos-border bg-cos-bg/40 p-4">
              <p className="text-xs font-semibold tracking-wide text-cos-muted uppercase">
                Volunteer needs
              </p>
              <p className="mt-2 text-sm leading-relaxed text-cos-text">{needs}</p>
            </div>
          ) : null}

          <ul className="grid gap-3 sm:grid-cols-3">
            <StatCard
              icon={Users}
              label="Total volunteers"
              value={stats.total !== null ? String(stats.total) : "—"}
            />
            <StatCard
              icon={UserCheck}
              label="Checked in"
              value={stats.checkedIn !== null ? String(stats.checkedIn) : "—"}
            />
            <StatCard
              icon={UserPlus}
              label="Still needed"
              value={
                stats.stillNeeded !== null ? String(stats.stillNeeded) : "—"
              }
            />
          </ul>

          {signupUrl ? (
            <Button href={signupUrl} variant="secondary" size="sm">
              Open signup sheet
              <ExternalLink className="h-3.5 w-3.5" />
            </Button>
          ) : null}
        </div>
      )}
    </section>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  label: string;
  value: string;
}) {
  return (
    <li className="rounded-xl border border-cos-border bg-cos-card p-4">
      <div className="flex items-center gap-2 text-cos-muted">
        <Icon className="h-4 w-4" strokeWidth={1.5} />
        <span className="text-xs font-medium tracking-wide uppercase">
          {label}
        </span>
      </div>
      <p className="mt-2 font-display text-3xl text-cos-text">{value}</p>
    </li>
  );
}
