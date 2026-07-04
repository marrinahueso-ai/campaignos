import Link from "next/link";
import {
  mergePlanningQuickLinks,
  PLANNING_QUICK_LINK_DEFINITIONS,
} from "@/lib/event-playbooks/planning-constants";
import { OpenFilledBadge } from "@/components/event-playbooks/OpenFilledBadge";
import type { Event } from "@/types";

interface OverviewQuickLinksPanelProps {
  event: Event;
  hasCampaign?: boolean;
}

export function OverviewQuickLinksPanel({
  event,
  hasCampaign = true,
}: OverviewQuickLinksPanelProps) {
  const links = mergePlanningQuickLinks(event.planningQuickLinks);

  const linkRowClass =
    "flex items-center justify-between gap-2 bg-cos-card px-3 py-2.5 text-sm font-medium text-cos-text transition-colors hover:bg-cos-bg-alt";

  return (
    <ul className="mt-2 divide-y divide-cos-border overflow-hidden rounded-sm border border-cos-border">
      {PLANNING_QUICK_LINK_DEFINITIONS.map(({ key, label, icon: Icon }) => {
        const entry = links[key];
        const href =
          entry.url.trim() ||
          (key === "communication_plan" && hasCampaign
            ? "#social-media"
            : key === "vendor_list"
              ? "#files"
              : "#settings");

        const content = (
          <>
            <span className="flex min-w-0 items-center gap-2.5">
              <Icon className="h-4 w-4 shrink-0 text-cos-dark-muted" strokeWidth={1.5} />
              <span>{label}</span>
            </span>
            <span className="flex items-center gap-2">
              <OpenFilledBadge status={entry.status} readOnly />
            </span>
          </>
        );

        if (entry.url.trim()) {
          return (
            <li key={key}>
              <a href={entry.url} target="_blank" rel="noreferrer" className={linkRowClass}>
                {content}
              </a>
            </li>
          );
        }

        return (
          <li key={key}>
            <Link href={href} className={linkRowClass}>
              {content}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
