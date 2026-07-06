"use server";

import { revalidatePath } from "next/cache";
import {
  saveInboxAiSourcesSettings,
  validateInboxAiSourcesInput,
} from "@/lib/organizations/inbox-ai-sources/mutations";
import {
  getCustomInboxAiSources,
  getInboxAiSourcesSettings,
} from "@/lib/organizations/inbox-ai-sources/queries";
import { getLatestOrganization } from "@/lib/organizations/queries";
import type { InboxAiSourcesSettingsInput } from "@/types/inbox-ai-sources";

export interface InboxAiSourcesActionState {
  error: string | null;
  success: boolean;
  savedCustomSources?: InboxAiSourcesSettingsInput["customSources"];
}

export async function getInboxAiSourcesSettingsData(): Promise<{
  organizationId: string;
  input: InboxAiSourcesSettingsInput;
} | null> {
  const organization = await getLatestOrganization();
  if (!organization) {
    return null;
  }

  const input = await getInboxAiSourcesSettings(organization);
  return { organizationId: organization.id, input };
}

function parseCustomSources(formData: FormData): InboxAiSourcesSettingsInput["customSources"] {
  const jsonValue = formData.get("customSourcesJson");
  if (typeof jsonValue === "string" && jsonValue.trim()) {
    try {
      const parsed: unknown = JSON.parse(jsonValue);
      if (Array.isArray(parsed)) {
        return parsed.map((entry) => {
          const source = entry as { id?: string; label?: string; url?: string };
          return {
            id: typeof source.id === "string" ? source.id : undefined,
            label: String(source.label ?? ""),
            url: String(source.url ?? ""),
          };
        });
      }
    } catch {
      // Fall back to legacy field names below.
    }
  }

  const labels = formData.getAll("customLabel").map((value) => String(value));
  const urls = formData.getAll("customUrl").map((value) => String(value));

  return labels.map((label, index) => ({
    label,
    url: urls[index] ?? "",
  }));
}

export async function saveInboxAiSourcesAction(
  _prevState: InboxAiSourcesActionState,
  formData: FormData,
): Promise<InboxAiSourcesActionState> {
  const organization = await getLatestOrganization();
  if (!organization) {
    return { error: "Complete School Setup first.", success: false };
  }

  const input: InboxAiSourcesSettingsInput = {
    eventsUrl: String(formData.get("eventsUrl") ?? ""),
    calendarUrl: String(formData.get("calendarUrl") ?? ""),
    resourcesUrl: String(formData.get("resourcesUrl") ?? ""),
    faqUrl: String(formData.get("faqUrl") ?? ""),
    customSources: parseCustomSources(formData),
  };

  const validationError = validateInboxAiSourcesInput(input);
  if (validationError) {
    return { error: validationError, success: false };
  }

  const saved = await saveInboxAiSourcesSettings(organization.id, input);
  if (!saved) {
    return {
      error: "Unable to save inbox AI sources. Run migration 044 first.",
      success: false,
    };
  }

  revalidatePath("/settings/inbox-ai-sources");
  revalidatePath("/settings/ai-brain");
  revalidatePath("/inbox");

  const persistedCustomSources = await getCustomInboxAiSources(organization.id);
  const savedCustomSources = persistedCustomSources.map((source) => ({
    id: source.id,
    label: source.label,
    url: source.url,
  }));

  return { error: null, success: true, savedCustomSources };
}
