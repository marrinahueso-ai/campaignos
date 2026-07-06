import { createClient } from "@/lib/supabase/server";
import type { InboxAiSourcesSettingsInput } from "@/types/inbox-ai-sources";

function normalizeUrl(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function isValidHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export function validateInboxAiSourcesInput(
  input: InboxAiSourcesSettingsInput,
): string | null {
  const urls = [
    input.eventsUrl,
    input.calendarUrl,
    input.resourcesUrl,
    input.faqUrl,
    ...input.customSources.map((source) => source.url),
  ].filter((url) => url.trim().length > 0);

  for (const url of urls) {
    if (!isValidHttpUrl(url.trim())) {
      return `Enter a valid http(s) URL: ${url.trim()}`;
    }
  }

  for (const source of input.customSources) {
    if (source.url.trim() && !source.label.trim()) {
      return "Each custom source needs a label.";
    }
  }

  return null;
}

export async function saveInboxAiSourcesSettings(
  organizationId: string,
  input: InboxAiSourcesSettingsInput,
): Promise<boolean> {
  const supabase = await createClient();
  const now = new Date().toISOString();

  const { error: orgError } = await supabase
    .from("organizations")
    .update({
      events_url: normalizeUrl(input.eventsUrl),
      calendar_url: normalizeUrl(input.calendarUrl),
      resources_url: normalizeUrl(input.resourcesUrl),
      faq_url: normalizeUrl(input.faqUrl),
    })
    .eq("id", organizationId);

  if (orgError) {
    console.error("Failed to save inbox AI URL settings:", orgError.message);
    return false;
  }

  const { error: deleteError } = await supabase
    .from("organization_inbox_ai_sources")
    .delete()
    .eq("organization_id", organizationId);

  if (deleteError?.code !== "42P01" && deleteError) {
    console.error("Failed to reset custom inbox AI sources:", deleteError.message);
    return false;
  }

  const customRows = input.customSources
    .filter((source) => source.url.trim())
    .map((source, index) => ({
      organization_id: organizationId,
      label: source.label.trim() || "Custom source",
      url: source.url.trim(),
      source_type: "custom" as const,
      sort_order: index,
      updated_at: now,
    }));

  if (customRows.length === 0) {
    return true;
  }

  const { error: insertError } = await supabase
    .from("organization_inbox_ai_sources")
    .insert(customRows);

  if (insertError) {
    console.error("Failed to save custom inbox AI sources:", insertError.message);
    return false;
  }

  return true;
}
