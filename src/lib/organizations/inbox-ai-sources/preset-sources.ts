import type { InboxAiSourceType } from "@/types/inbox-ai-sources";
import type { Organization } from "@/types";
import type { OrderedInboxAiSource } from "@/lib/organizations/inbox-ai-sources/queries";

export interface InboxAiPresetSourceDisplay {
  label: string;
  url: string | null;
  type: string;
  sourceType: InboxAiSourceType;
}

export function buildPresetInboxAiSourcesFromOrganization(
  organization: Organization,
): InboxAiPresetSourceDisplay[] {
  return [
    {
      label: "Events page",
      url: organization.eventsUrl,
      type: "Website",
      sourceType: "events",
    },
    {
      label: "Calendar",
      url: organization.calendarUrl,
      type: "Calendar",
      sourceType: "calendar",
    },
    {
      label: "Resources",
      url: organization.resourcesUrl,
      type: "Website",
      sourceType: "resources",
    },
    {
      label: "FAQ",
      url: organization.faqUrl,
      type: "Document",
      sourceType: "faq",
    },
    {
      label: "School website",
      url: organization.schoolWebsite,
      type: "Website",
      sourceType: "custom",
    },
    {
      label: "PTO website",
      url: organization.ptoWebsite,
      type: "Website",
      sourceType: "custom",
    },
  ];
}

export function presetSourcesToOrdered(
  presets: InboxAiPresetSourceDisplay[],
): OrderedInboxAiSource[] {
  return presets
    .filter((source) => source.url?.trim())
    .map((source) => ({
      label: source.label,
      url: source.url!.trim(),
      description: null,
      sourceType: source.sourceType,
    }));
}

/** Custom sources win when URLs overlap; presets fill gaps. */
export function mergeOrderedInboxAiSources(input: {
  presetSources: OrderedInboxAiSource[];
  customSources: OrderedInboxAiSource[];
}): OrderedInboxAiSource[] {
  const seenUrls = new Set<string>();
  const merged: OrderedInboxAiSource[] = [];

  for (const source of input.customSources) {
    const normalizedUrl = source.url.trim().toLowerCase();
    if (!normalizedUrl || seenUrls.has(normalizedUrl)) {
      continue;
    }

    seenUrls.add(normalizedUrl);
    merged.push(source);
  }

  for (const source of input.presetSources) {
    const normalizedUrl = source.url.trim().toLowerCase();
    if (!normalizedUrl || seenUrls.has(normalizedUrl)) {
      continue;
    }

    seenUrls.add(normalizedUrl);
    merged.push(source);
  }

  return merged;
}
