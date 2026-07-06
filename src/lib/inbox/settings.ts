import "server-only";

import { debugToken } from "@/lib/meta-publishing/graph-api";
import {
  filterInboxRelevantScopes,
  formatGrantedScopes,
  hasInboxOAuthScopes,
  parseGrantedScopes,
} from "@/lib/inbox/scopes";
import type { OrganizationInboxSettingsRow } from "@/lib/inbox/db-types";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export interface OrganizationInboxSettings {
  id: string;
  organizationId: string;
  syncEnabled: boolean;
  lastSyncedAt: string | null;
  lastSyncError: string | null;
  messagingScopesGranted: string[];
  createdAt: string;
  updatedAt: string;
}

function mapSettingsRow(row: OrganizationInboxSettingsRow): OrganizationInboxSettings {
  return {
    id: row.id,
    organizationId: row.organization_id,
    syncEnabled: row.sync_enabled,
    lastSyncedAt: row.last_synced_at,
    lastSyncError: row.last_sync_error,
    messagingScopesGranted: parseGrantedScopes(row.messaging_scopes_granted),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getOrganizationInboxSettings(
  organizationId: string,
): Promise<OrganizationInboxSettings | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("organization_inbox_settings")
    .select("*")
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return mapSettingsRow(data as OrganizationInboxSettingsRow);
}

export async function upsertOrganizationInboxSettings(input: {
  organizationId: string;
  syncEnabled?: boolean;
  lastSyncedAt?: string | null;
  lastSyncError?: string | null;
  messagingScopesGranted?: string[];
}): Promise<OrganizationInboxSettings | null> {
  const supabase = await createClient();
  const now = new Date().toISOString();
  const payload: Record<string, unknown> = {
    organization_id: input.organizationId,
    updated_at: now,
  };

  if (input.syncEnabled !== undefined) {
    payload.sync_enabled = input.syncEnabled;
  }
  if (input.lastSyncedAt !== undefined) {
    payload.last_synced_at = input.lastSyncedAt;
  }
  if (input.lastSyncError !== undefined) {
    payload.last_sync_error = input.lastSyncError;
  }
  if (input.messagingScopesGranted !== undefined) {
    payload.messaging_scopes_granted = formatGrantedScopes(input.messagingScopesGranted);
  }

  const { data, error } = await supabase
    .from("organization_inbox_settings")
    .upsert(payload, { onConflict: "organization_id" })
    .select("*")
    .single();

  if (error || !data) {
    return null;
  }

  return mapSettingsRow(data as OrganizationInboxSettingsRow);
}

export async function touchOrganizationInboxSyncedAt(
  organizationId: string,
): Promise<void> {
  const admin = createAdminClient();
  const now = new Date().toISOString();

  const { error } = await admin.from("organization_inbox_settings").upsert(
    {
      organization_id: organizationId,
      last_synced_at: now,
      updated_at: now,
    },
    { onConflict: "organization_id" },
  );

  if (error) {
    console.error("[inbox webhook] failed to update last_synced_at:", error.message);
  }
}

export async function refreshInboxScopesFromPageToken(input: {
  organizationId: string;
  pageAccessToken: string;
  enableSync?: boolean;
}): Promise<OrganizationInboxSettings | null> {
  const debug = await debugToken({ inputToken: input.pageAccessToken });
  const scopes = filterInboxRelevantScopes(debug.scopes);
  const inboxReady = hasInboxOAuthScopes(scopes);

  return upsertOrganizationInboxSettings({
    organizationId: input.organizationId,
    messagingScopesGranted: scopes,
    syncEnabled: inboxReady && (input.enableSync ?? inboxReady),
    lastSyncError: debug.error,
  });
}
