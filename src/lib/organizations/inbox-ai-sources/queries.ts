import { createClient } from "@/lib/supabase/server";
import type {
  InboxAiSourcesSettingsInput,
  OrganizationInboxAiSource,
  OrganizationInboxAiSourceRow,
  OrganizationInboxAiUrlSettings,
} from "@/types/inbox-ai-sources";
import type { Organization } from "@/types";

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

  if (error) {
    console.error(
      `Failed to load inbox AI sources for org ${organizationId}:`,
      error.message,
    );
    return [];
  }

  if (!data) {
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
  customSources: OrganizationInboxAiSource[];
}): OrderedInboxAiSource[] {
  const ordered: OrderedInboxAiSource[] = [];

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

  return {
    customSources: customSources.map((source) => ({
      id: source.id,
      label: source.label,
      url: source.url,
      description: source.description ?? "",
    })),
  };
}

/** Loads org inbox AI sources in the same shape used by draft generation. */
export async function loadOrderedInboxAiSourcesForOrganization(
  organizationId: string,
): Promise<OrderedInboxAiSource[]> {
  const customSources = await getCustomInboxAiSources(organizationId);
  return buildOrderedInboxAiSources({ customSources });
}
