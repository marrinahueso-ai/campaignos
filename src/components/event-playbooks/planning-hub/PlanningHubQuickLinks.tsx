import Link from "next/link";
import { Paperclip } from "lucide-react";
import {
  mergePlanningQuickLinks,
  PLANNING_QUICK_LINK_DEFINITIONS,
} from "@/lib/event-playbooks/planning-constants";
import {
  PlanningHubActionLink,
  PlanningHubCard,
  PlanningHubSectionTitle,
} from "@/components/event-playbooks/planning-hub/PlanningHubPrimitives";
import type { EventPlaybookTab } from "@/components/event-playbooks/EventPlaybookTabs";
import type { Event } from "@/types";

const ICON_COLORS = [
  "text-[#5b8fc7]",
  "text-[#5a9e6f]",
  "text-[#e8944a]",
  "text-[#8b6fbf]",
  "text-[#e87461]",
];

interface PlanningHubQuickLinksProps {
  event: Event;
  hasCampaign?: boolean;
  onNavigateTab: (tab: EventPlaybookTab) => void;
}

export function PlanningHubQuickLinks({
  event,
  hasCampaign = true,
  onNavigateTab,
}: PlanningHubQuickLinksProps) {
  const links = mergePlanningQuickLinks(event.planningQuickLinks);

  function resolveHref(key: string, url: string): string {
    if (url.trim()) {
      return url;
    }
    if (key === "communication_plan" && hasCampaign) {
      return "#social-media";
    }
    if (key === "vendor_list") {
      return "#files";
    }
    if (key === "event_budget") {
      return "#settings";
    }
    return "#settings";
  }

  return (
    <PlanningHubCard className="flex h-full flex-col p-5">
      <PlanningHubSectionTitle icon={Paperclip} title="Quick Links" />

      <ul className="mt-4 flex-1 space-y-1">
        {PLANNING_QUICK_LINK_DEFINITIONS.map(({ key, label, icon: Icon }, index) => {
          const entry = links[key];
          const href = resolveHref(key, entry.url);
          const isExternal = Boolean(entry.url.trim());
          const iconColor = ICON_COLORS[index % ICON_COLORS.length];

          const row = (
            <div className="flex items-center justify-between gap-3 rounded-lg px-1 py-2.5 transition-colors hover:bg-[#faf7f2]">
              <span className="flex min-w-0 items-center gap-2.5">
                <Icon className={`h-4 w-4 shrink-0 ${iconColor}`} strokeWidth={1.5} />
                <span className="text-sm font-medium text-[#2a2622]">{label}</span>
              </span>
              <PlanningHubActionLink
                href={isExternal ? href : undefined}
                onClick={
                  !isExternal
                    ? () => {
                        if (href.startsWith("#")) {
                          const tab = href.replace("#", "") as EventPlaybookTab;
                          onNavigateTab(tab);
                          window.location.hash = tab;
                        }
                      }
                    : undefined
                }
              >
                Open
              </PlanningHubActionLink>
            </div>
          );

          return (
            <li key={key}>
              {isExternal ? (
                <a href={href} target="_blank" rel="noreferrer">
                  {row}
                </a>
              ) : (
                <Link href={href}>{row}</Link>
              )}
            </li>
          );
        })}
      </ul>
    </PlanningHubCard>
  );
}
