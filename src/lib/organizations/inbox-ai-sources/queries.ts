import { createClient } from "@/lib/supabase/server";
import type {
  InboxAiSourcesSettingsInput,
  OrganizationInboxAiSource,
  OrganizationInboxAiSourceRow,
  OrganizationInboxAiUrlSettings,
} from "@/types/inbox-ai-sources";
import type { Organization } from "@/types";

const DEFAULT_SOURCE_LABELS = {
  events: "Events page",
  calendar: "Calendar page",
  resources: "Resources page",
  faq: "FAQ / knowledge base",
} as const;

export function mapInboxAiSourceRow(row: OrganizationInboxAiSourceRow): OrganizationInboxAiSource {
  return {
    id: row.id,
    organizationId: row.organization_id,
    label: row.label,
    url: row.url,
    description: row.description,
    sourceType: row.source_type,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function urlSettingsFromOrganization(
  organization: Organization,
): OrganizationInboxAiUrlSettings {
  return {
    eventsUrl: organization.eventsUrl,
    calendarUrl: organization.calendarUrl,
    resourcesUrl: organization.resourcesUrl,
    faqUrl: organization.faqUrl,
  };
}

export async function getCustomInboxAiSources(
  organizationId: string,
): Promise<OrganizationInboxAiSource[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("organization_inbox_ai_sources")
    .select("*")
    .eq("organization_id", organizationId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error?.code === "42P01") {
    return [];
  }

  if (error || !data) {
    return [];
  }

  return (data as OrganizationInboxAiSourceRow[]).map(mapInboxAiSourceRow);
}

export interface OrderedInboxAiSource {
  label: string;
  url: string;
  description: string | null;
  sourceType: OrganizationInboxAiSource["sourceType"];
}

export function buildOrderedInboxAiSources(input: {
  urlSettings: OrganizationInboxAiUrlSettings;
  customSources: OrganizationInboxAiSource[];
}): OrderedInboxAiSource[] {
  const ordered: OrderedInboxAiSource[] = [];

  const defaults: Array<{
    key: keyof OrganizationInboxAiUrlSettings;
    sourceType: OrganizationInboxAiSource["sourceType"];
  }> = [
    { key: "eventsUrl", sourceType: "events" },
    { key: "calendarUrl", sourceType: "calendar" },
    { key: "resourcesUrl", sourceType: "resources" },
    { key: "faqUrl", sourceType: "faq" },
  ];

  for (const entry of defaults) {
    const url = input.urlSettings[entry.key]?.trim();
    if (!url) {
      continue;
    }

    ordered.push({
      label: DEFAULT_SOURCE_LABELS[entry.sourceType as Exclude<
        OrganizationInboxAiSource["sourceType"],
        "custom"
      >],
      url,
      description: null,
      sourceType: entry.sourceType,
    });
  }

  for (const source of input.customSources) {
    const url = source.url.trim();
    if (!url) {
      continue;
    }

    ordered.push({
      label: source.label.trim() || "Custom source",
      url,
      description: source.description?.trim() || null,
      sourceType: "custom",
    });
  }

  return ordered;
}

export async function getInboxAiSourcesSettings(
  organization: Organization,
): Promise<InboxAiSourcesSettingsInput> {
  const customSources = await getCustomInboxAiSources(organization.id);
  const urlSettings = urlSettingsFromOrganization(organization);

  return {
    eventsUrl: urlSettings.eventsUrl ?? "",
    calendarUrl: urlSettings.calendarUrl ?? "",
    resourcesUrl: urlSettings.resourcesUrl ?? "",
    faqUrl: urlSettings.faqUrl ?? "",
    customSources: customSources.map((source) => ({
      id: source.id,
      label: source.label,
      url: source.url,
      description: source.description ?? "",
    })),
  };
}
