import { UserCheck, UserPlus, Users } from "lucide-react";
import {
  PH,
  PlanningHubActionLink,
  PlanningHubCard,
  PlanningHubIconSquare,
  PlanningHubSectionTitle,
} from "@/components/event-playbooks/planning-hub/PlanningHubPrimitives";
import { parseVolunteerStats } from "@/lib/event-playbooks/planning-hub-utils";
import type { EventPlaybookTab } from "@/components/event-playbooks/EventPlaybookTabs";
import type { Event } from "@/types";

interface PlanningHubVolunteerInfoProps {
  event: Event;
  onNavigateTab: (tab: EventPlaybookTab) => void;
}

function StatBlock({
  icon: Icon,
  label,
  value,
  bg,
  color,
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  label: string;
  value: string;
  bg: string;
  color: string;
}) {
  return (
    <li className="flex items-center gap-3 rounded-[10px] border border-cos-border bg-cos-bg px-3 py-3">
      <PlanningHubIconSquare icon={Icon} bg={bg} color={color} className="h-10 w-10 rounded-[10px]" />
      <div>
        <p className="text-[10px] font-semibold tracking-[0.12em] text-cos-dark-muted uppercase">
          {label}
        </p>
        <p className="font-display text-2xl leading-tight text-cos-text">
          {value}
        </p>
      </div>
    </li>
  );
}

export function PlanningHubVolunteerInfo({
  event,
  onNavigateTab,
}: PlanningHubVolunteerInfoProps) {
  const signupUrl = event.planningQuickLinks?.volunteer_signup?.url?.trim();
  const stats = parseVolunteerStats(event);
  const hasVolunteerPlan = Boolean(signupUrl || event.volunteerNeeds?.trim());

  const formatStat = (value: number | null) =>
    value !== null ? String(value) : "—";

  return (
    <PlanningHubCard className="flex h-full flex-col p-5">
      <PlanningHubSectionTitle
        icon={Users}
        title="Volunteer Information"
        action={
          <PlanningHubActionLink onClick={() => onNavigateTab("settings")}>
            View all volunteers →
          </PlanningHubActionLink>
        }
      />

      {!hasVolunteerPlan ? (
        <div className="mt-4 flex-1 rounded-[10px] border border-dashed border-cos-border px-4 py-8 text-center">
          <p className="text-sm text-cos-muted">
            Add a volunteer signup link or volunteer needs in Settings to track help
            for this event.
          </p>
          <PlanningHubActionLink
            onClick={() => onNavigateTab("settings")}
            className="mt-3"
          >
            Set up volunteers →
          </PlanningHubActionLink>
        </div>
      ) : (
        <>
          <ul className="mt-4 flex-1 space-y-3">
            <StatBlock
              icon={Users}
              label="Total volunteers"
              value={formatStat(stats.total)}
              bg={PH.iconTints.blue.bg}
              color={PH.iconTints.blue.color}
            />
            <StatBlock
              icon={UserCheck}
              label="Checked in"
              value={formatStat(stats.checkedIn)}
              bg={PH.iconTints.green.bg}
              color={PH.iconTints.green.color}
            />
            <StatBlock
              icon={UserPlus}
              label="Still needed"
              value={formatStat(stats.stillNeeded)}
              bg={PH.iconTints.coral.bg}
              color={PH.iconTints.coral.color}
            />
          </ul>

          {signupUrl && (
            <PlanningHubActionLink href={signupUrl} className="mt-4">
              Open signup sheet →
            </PlanningHubActionLink>
          )}
        </>
      )}
    </PlanningHubCard>
  );
}
