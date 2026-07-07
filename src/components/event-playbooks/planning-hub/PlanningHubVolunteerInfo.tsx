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
    <li
      className="flex items-center gap-3 rounded-[10px] border px-3 py-3"
      style={{ borderColor: PH.cardBorder, backgroundColor: PH.pageBg }}
    >
      <PlanningHubIconSquare icon={Icon} bg={bg} color={color} className="h-10 w-10 rounded-[10px]" />
      <div>
        <p
          className="text-[10px] font-semibold tracking-[0.12em] uppercase"
          style={{ color: PH.textMuted }}
        >
          {label}
        </p>
        <p
          className="font-display text-2xl leading-tight"
          style={{ color: PH.textPrimary }}
        >
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
        <div
          className="mt-4 flex-1 rounded-[10px] border border-dashed px-4 py-8 text-center"
          style={{ borderColor: PH.cardBorder }}
        >
          <p className="text-sm" style={{ color: PH.textSecondary }}>
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
              bg="#E4EDF8"
              color="#5B8FC7"
            />
            <StatBlock
              icon={UserCheck}
              label="Checked in"
              value={formatStat(stats.checkedIn)}
              bg="#E4F2E8"
              color="#5A9E6F"
            />
            <StatBlock
              icon={UserPlus}
              label="Still needed"
              value={formatStat(stats.stillNeeded)}
              bg="#FCE8E4"
              color="#E87461"
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
