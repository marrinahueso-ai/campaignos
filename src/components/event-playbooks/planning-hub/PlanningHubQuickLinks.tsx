import Link from "next/link";
import {
  Calendar,
  ClipboardList,
  MessageSquare,
  MessagesSquare,
  Paperclip,
  Users,
} from "lucide-react";
import {
  mergePlanningQuickLinks,
  type PlanningQuickLinkDefinition,
  type PlanningQuickLinkKey,
} from "@/lib/event-playbooks/planning-constants";
import {
  PH,
  PlanningHubActionLink,
  PlanningHubCard,
  PlanningHubIconSquare,
  PlanningHubSectionTitle,
} from "@/components/event-playbooks/planning-hub/PlanningHubPrimitives";
import type { EventPlaybookTab } from "@/components/event-playbooks/EventPlaybookTabs";
import type { Event } from "@/types";

const MOCKUP_QUICK_LINKS: PlanningQuickLinkDefinition[] = [
  { key: "volunteer_signup", label: "Volunteer Signup", icon: Users },
  { key: "marketing_materials", label: "Marketing Materials", icon: MessageSquare },
  { key: "vendor_list", label: "Vendor List", icon: Calendar },
  { key: "communication_plan", label: "Communication Plan", icon: MessagesSquare },
  { key: "event_budget", label: "Event Budget", icon: ClipboardList },
];

const ICON_STYLES: Record<
  PlanningQuickLinkKey,
  { bg: string; color: string }
> = {
  volunteer_signup: PH.iconTints.blue,
  marketing_materials: PH.iconTints.green,
  vendor_list: PH.iconTints.orange,
  communication_plan: PH.iconTints.purple,
  event_budget: PH.iconTints.coral,
};

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

  function resolveHref(key: PlanningQuickLinkKey, url: string): string {
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

      <ul className="mt-4 flex-1 divide-y divide-cos-border">
        {MOCKUP_QUICK_LINKS.map(({ key, label, icon: Icon }) => {
          const entry = links[key];
          const href = resolveHref(key, entry.url);
          const isExternal = Boolean(entry.url.trim());
          const iconStyle = ICON_STYLES[key];

          const row = (
            <div className="flex items-center justify-between gap-3 py-3">
              <span className="flex min-w-0 items-center gap-2.5">
                <PlanningHubIconSquare
                  icon={Icon}
                  bg={iconStyle.bg}
                  color={iconStyle.color}
                />
                <span className="text-sm font-medium text-cos-text">
                  {label}
                </span>
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
