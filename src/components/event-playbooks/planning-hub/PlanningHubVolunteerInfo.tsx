import { Users } from "lucide-react";
import {
  PlanningHubActionLink,
  PlanningHubCard,
  PlanningHubSectionTitle,
} from "@/components/event-playbooks/planning-hub/PlanningHubPrimitives";
import type { EventPlaybookTab } from "@/components/event-playbooks/EventPlaybookTabs";
import type { Event } from "@/types";

function parseStillNeeded(event: Event): number | null {
  const needsText = event.volunteerNeeds?.trim();
  if (!needsText) {
    return null;
  }
  const numberMatch = needsText.match(/(\d+)/);
  return numberMatch ? Number(numberMatch[1]) : null;
}

interface PlanningHubVolunteerInfoProps {
  event: Event;
  onNavigateTab: (tab: EventPlaybookTab) => void;
}

export function PlanningHubVolunteerInfo({
  event,
  onNavigateTab,
}: PlanningHubVolunteerInfoProps) {
  const signupUrl = event.planningQuickLinks?.volunteer_signup?.url?.trim();
  const stillNeeded = parseStillNeeded(event);
  const hasVolunteerPlan = Boolean(signupUrl || event.volunteerNeeds?.trim());

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
        <div className="mt-4 flex-1 rounded-lg border border-dashed border-[#e8e0d4] px-4 py-8 text-center">
          <p className="text-sm text-[#7a7268]">
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
        <ul className="mt-4 flex-1 space-y-3">
          <li className="flex items-center gap-3 rounded-lg border border-[#f0ebe3] bg-[#faf7f2] px-3 py-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#e4edf8]">
              <Users className="h-4 w-4 text-[#5b8fc7]" strokeWidth={1.5} />
            </span>
            <div>
              <p className="text-[10px] font-semibold tracking-[0.12em] text-[#a89f94] uppercase">
                Volunteer signup
              </p>
              <p className="text-sm font-medium text-[#2a2622]">
                {signupUrl ? "Link on file" : "Needs listed in event plan"}
              </p>
              <p className="text-xs text-[#7a7268]">
                {signupUrl ? "From SignUpGenius or your signup tool" : event.volunteerNeeds}
              </p>
            </div>
          </li>

          {stillNeeded !== null && (
            <li className="flex items-center gap-3 rounded-lg border border-[#f0ebe3] bg-[#faf7f2] px-3 py-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#fce8e4]">
                <Users className="h-4 w-4 text-[#e87461]" strokeWidth={1.5} />
              </span>
              <div>
                <p className="text-[10px] font-semibold tracking-[0.12em] text-[#a89f94] uppercase">
                  Still needed
                </p>
                <p className="font-display text-xl text-[#2a2622]">{stillNeeded}</p>
                <p className="text-xs text-[#7a7268]">From volunteer needs on file</p>
              </div>
            </li>
          )}

          {signupUrl && (
            <li>
              <PlanningHubActionLink href={signupUrl}>Open signup sheet →</PlanningHubActionLink>
            </li>
          )}
        </ul>
      )}
    </PlanningHubCard>
  );
}
