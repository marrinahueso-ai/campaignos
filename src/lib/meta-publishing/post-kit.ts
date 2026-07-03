import type { Event } from "@/types";
import { mergePlanningQuickLinks } from "@/lib/event-playbooks/planning-constants";

const SHARE_LINK_KEYS = ["volunteer_signup", "marketing_materials"] as const;

/** Best external link for captions/stories — volunteer signup or marketing materials URL. */
export function resolveEventShareLink(event: Event): string | null {
  const links = mergePlanningQuickLinks(event.planningQuickLinks);

  for (const key of SHARE_LINK_KEYS) {
    const url = links[key]?.url?.trim();
    if (url) {
      return url;
    }
  }

  return null;
}

export async function copyTextToClipboard(text: string): Promise<void> {
  await navigator.clipboard.writeText(text);
}
