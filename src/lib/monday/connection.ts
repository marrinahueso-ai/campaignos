import "server-only";

import { randomBytes } from "crypto";
import { getLatestOrganization } from "@/lib/organizations/queries";
import { createClient } from "@/lib/supabase/server";
import {
  MONDAY_TOKEN_URL,
  getMondayClientId,
  getMondayClientSecret,
} from "@/lib/monday/config";
import { fetchMondayAccountInfo } from "@/lib/monday/client";
import type { MondayTokenResponse } from "@/lib/monday/db-types";
import {
  mapMondayBoardMappingRow,
  mapMondayConnectionRow,
  mapMondayTaskLinkRow,
} from "@/lib/monday/mappers";
import type {
  MondayBoardMappingRow,
  MondayConnectionRow,
  MondayTaskLinkRow,
} from "@/lib/monday/db-types";
import type {
  MondayBoardColumnMap,
  MondayBoardMapping,
  MondayConnection,
  MondayItemLink,
} from "@/lib/monday/types";

export function createMondayOAuthState(): string {
  return randomBytes(24).toString("hex");
}

export function isMondayConnectionConfigured(
  connection: MondayConnection | null,
): connection is MondayConnection {
  return Boolean(connection?.accessToken);
}

export async function getMondayConnectionForOrganization(
  organizationId: string,
): Promise<MondayConnection | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("organization_monday_connections")
    .select("*")
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return mapMondayConnectionRow(data as MondayConnectionRow);
}

export async function getMondayConnectionForCurrentOrg(): Promise<MondayConnection | null> {
  const organization = await getLatestOrganization();
  if (!organization) {
    return null;
  }
  return getMondayConnectionForOrganization(organization.id);
}

async function exchangeMondayToken(body: URLSearchParams): Promise<MondayTokenResponse | null> {
  const response = await fetch(MONDAY_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!response.ok) {
    const text = await response.text();
    console.error("Monday token exchange failed:", response.status, text);
    return null;
  }

  return (await response.json()) as MondayTokenResponse;
}

export async function exchangeMondayAuthorizationCode(input: {
  code: string;
  redirectUri: string;
}): Promise<MondayTokenResponse | null> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: getMondayClientId(),
    client_secret: getMondayClientSecret(),
    redirect_uri: input.redirectUri,
    code: input.code,
  });

  return exchangeMondayToken(body);
}

export async function saveMondayConnectionFromTokenResponse(
  organizationId: string,
  token: MondayTokenResponse,
): Promise<boolean> {
  const account = await fetchMondayAccountInfo(token.access_token);
  const supabase = await createClient();
  const now = new Date().toISOString();

  const { error } = await supabase.from("organization_monday_connections").upsert(
    {
      organization_id: organizationId,
      access_token: token.access_token,
      account_id: account?.id ?? null,
      account_slug: account?.slug ?? null,
      scopes: token.scope ?? null,
      updated_at: now,
    },
    { onConflict: "organization_id" },
  );

  if (error) {
    console.error("Failed to save Monday connection:", error.message);
    return false;
  }

  return true;
}

export async function disconnectMondayConnection(organizationId: string): Promise<boolean> {
  const supabase = await createClient();

  const { error: mappingError } = await supabase
    .from("organization_monday_board_mappings")
    .delete()
    .eq("organization_id", organizationId);

  if (mappingError && mappingError.code !== "42P01") {
    console.error("Failed to delete Monday board mapping:", mappingError.message);
    return false;
  }

  const { error: linksError } = await supabase
    .from("event_playbook_task_monday_links")
    .delete()
    .eq("organization_id", organizationId);

  if (linksError && linksError.code !== "42P01") {
    console.error("Failed to delete Monday task links:", linksError.message);
    return false;
  }

  const { error } = await supabase
    .from("organization_monday_connections")
    .delete()
    .eq("organization_id", organizationId);

  return !error || error.code === "42P01";
}

export async function setMondaySyncEnabled(
  organizationId: string,
  enabled: boolean,
): Promise<boolean> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("organization_monday_connections")
    .update({ monday_sync_enabled: enabled, updated_at: new Date().toISOString() })
    .eq("organization_id", organizationId);

  return !error;
}

export async function getMondayBoardMappingForOrganization(
  organizationId: string,
): Promise<MondayBoardMapping | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("organization_monday_board_mappings")
    .select("*")
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return mapMondayBoardMappingRow(data as MondayBoardMappingRow);
}

export async function saveMondayBoardMapping(input: {
  organizationId: string;
  mondayBoardId: string;
  mondayWorkspaceId: string | null;
  columnMap: MondayBoardColumnMap;
}): Promise<boolean> {
  const supabase = await createClient();
  const now = new Date().toISOString();

  const { error } = await supabase.from("organization_monday_board_mappings").upsert(
    {
      organization_id: input.organizationId,
      monday_board_id: input.mondayBoardId,
      monday_workspace_id: input.mondayWorkspaceId,
      column_map: input.columnMap,
      updated_at: now,
    },
    { onConflict: "organization_id" },
  );

  if (error) {
    console.error("Failed to save Monday board mapping:", error.message);
    return false;
  }

  return true;
}

export async function updateMondayCommitteeGroups(
  organizationId: string,
  committeeGroups: Record<string, string>,
): Promise<boolean> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("organization_monday_board_mappings")
    .update({
      committee_groups: committeeGroups,
      updated_at: new Date().toISOString(),
    })
    .eq("organization_id", organizationId);

  return !error;
}

export async function getMondayTaskLinksForOrganization(
  organizationId: string,
): Promise<MondayItemLink[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("event_playbook_task_monday_links")
    .select("*")
    .eq("organization_id", organizationId);

  if (error || !data) {
    return [];
  }

  return (data as MondayTaskLinkRow[]).map(mapMondayTaskLinkRow);
}

export async function getMondayTaskLinksForTaskIds(
  taskIds: string[],
): Promise<MondayItemLink[]> {
  if (taskIds.length === 0) {
    return [];
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("event_playbook_task_monday_links")
    .select("*")
    .in("event_playbook_task_id", taskIds);

  if (error || !data) {
    return [];
  }

  return (data as MondayTaskLinkRow[]).map(mapMondayTaskLinkRow);
}

export async function saveMondayTaskLink(input: {
  organizationId: string;
  eventPlaybookTaskId: string;
  mondayItemId: string;
  mondayBoardId: string;
}): Promise<boolean> {
  const supabase = await createClient();
  const now = new Date().toISOString();

  const { error } = await supabase.from("event_playbook_task_monday_links").upsert(
    {
      organization_id: input.organizationId,
      event_playbook_task_id: input.eventPlaybookTaskId,
      monday_item_id: input.mondayItemId,
      monday_board_id: input.mondayBoardId,
      last_synced_at: now,
      sync_version: 1,
      updated_at: now,
    },
    { onConflict: "event_playbook_task_id" },
  );

  return !error;
}

export async function areMondayTablesAvailable(): Promise<boolean> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("organization_monday_connections")
    .select("id")
    .limit(1);

  return !error;
}
