import "server-only";

import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { getLatestOrganization } from "@/lib/organizations/queries";
import { createClient } from "@/lib/supabase/server";
import {
  MONDAY_TOKEN_URL,
  describeMondayClientSecretForLogging,
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

const MONDAY_OAUTH_STATE_TTL_SECONDS = 60 * 10;
const MONDAY_OAUTH_DEFAULT_RETURN = "/settings/monday";

function signMondayOAuthStatePayload(payload: string): string {
  return createHmac("sha256", getMondayClientSecret()).update(payload).digest("base64url");
}

function safeCompareMondayStateSignatures(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }
  return timingSafeEqual(leftBuffer, rightBuffer);
}

function normalizeMondayOAuthReturnTo(returnTo: string): string {
  return returnTo.startsWith("/") && !returnTo.startsWith("//")
    ? returnTo
    : MONDAY_OAUTH_DEFAULT_RETURN;
}

function encodeMondayOAuthStateField(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url");
}

function decodeMondayOAuthStateField(value: string): string {
  return Buffer.from(value, "base64url").toString("utf8");
}

/** Signed OAuth state survives cross-site redirects without relying on cookies. */
export function createMondayOAuthState(returnTo: string, redirectUri: string): string {
  const safeReturnTo = normalizeMondayOAuthReturnTo(returnTo);
  const nonce = randomBytes(32).toString("base64url");
  const issuedAt = Math.floor(Date.now() / 1000).toString();
  const encodedReturnTo = encodeMondayOAuthStateField(safeReturnTo);
  const encodedRedirectUri = encodeMondayOAuthStateField(redirectUri);
  const payload = `${nonce}.${issuedAt}.${encodedReturnTo}.${encodedRedirectUri}`;
  return `${payload}.${signMondayOAuthStatePayload(payload)}`;
}

export function parseMondayOAuthState(
  state: string | null | undefined,
): { valid: boolean; returnTo: string | null; redirectUri: string | null } {
  if (!state) {
    return { valid: false, returnTo: null, redirectUri: null };
  }

  const parts = state.split(".");
  if (parts.length !== 5) {
    return { valid: false, returnTo: null, redirectUri: null };
  }

  const [nonce, issuedAtRaw, encodedReturnTo, encodedRedirectUri, signature] = parts;
  if (!nonce || !issuedAtRaw || !encodedReturnTo || !encodedRedirectUri || !signature) {
    return { valid: false, returnTo: null, redirectUri: null };
  }

  const payload = `${nonce}.${issuedAtRaw}.${encodedReturnTo}.${encodedRedirectUri}`;
  if (!safeCompareMondayStateSignatures(signature, signMondayOAuthStatePayload(payload))) {
    return { valid: false, returnTo: null, redirectUri: null };
  }

  const issuedAt = Number(issuedAtRaw);
  if (!Number.isFinite(issuedAt)) {
    return { valid: false, returnTo: null, redirectUri: null };
  }

  const ageSeconds = Math.floor(Date.now() / 1000) - issuedAt;
  if (ageSeconds < 0 || ageSeconds > MONDAY_OAUTH_STATE_TTL_SECONDS) {
    return { valid: false, returnTo: null, redirectUri: null };
  }

  try {
    const returnTo = normalizeMondayOAuthReturnTo(
      decodeMondayOAuthStateField(encodedReturnTo),
    );
    const redirectUri = decodeMondayOAuthStateField(encodedRedirectUri);
    return { valid: true, returnTo, redirectUri };
  } catch {
    return { valid: false, returnTo: null, redirectUri: null };
  }
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

export type MondayTokenExchangeResult =
  | { ok: true; token: MondayTokenResponse }
  | {
      ok: false;
      error: string;
      errorDescription: string | null;
      status: number;
    };

function parseMondayTokenErrorBody(
  text: string,
): { error: string; errorDescription: string | null } {
  try {
    const parsed = JSON.parse(text) as {
      error?: string;
      error_description?: string;
      message?: string;
    };
    return {
      error: parsed.error?.trim() || "token_exchange_failed",
      errorDescription: parsed.error_description?.trim() || parsed.message?.trim() || null,
    };
  } catch {
    const trimmed = text.trim();
    return {
      error: "token_exchange_failed",
      errorDescription: trimmed || null,
    };
  }
}

function shouldRetryMondayTokenWithBasicAuth(result: MondayTokenExchangeResult): boolean {
  if (result.ok) {
    return false;
  }

  const description = result.errorDescription?.toLowerCase() ?? "";
  return (
    result.error === "invalid_client" ||
    (result.error === "invalid_request" && description.includes("client_secret"))
  );
}

function logMondayTokenExchangeDiagnostics(
  redirectUri: string | null,
  clientId: string,
  clientSecret: string,
  authMode: "body" | "basic",
): void {
  const secretDiagnostics = describeMondayClientSecretForLogging(
    clientSecret,
    process.env.MONDAY_CLIENT_SECRET,
  );

  console.info("Monday token exchange request:", {
    authMode,
    clientIdPrefix: clientId.slice(0, 8),
    clientSecretDefined: Boolean(process.env.MONDAY_CLIENT_SECRET),
    clientSecretLength: secretDiagnostics.length,
    clientSecretFirstCharCode: secretDiagnostics.firstCharCode,
    clientSecretLastCharCode: secretDiagnostics.lastCharCode,
    clientSecretHadSurroundingQuotes: secretDiagnostics.hasSurroundingQuotes,
    redirectUri,
  });
}

async function postMondayToken(
  body: URLSearchParams,
  extraHeaders?: Record<string, string>,
): Promise<MondayTokenExchangeResult> {
  const redirectUri = body.get("redirect_uri");

  const response = await fetch(MONDAY_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      ...extraHeaders,
    },
    body: body.toString(),
  });

  if (!response.ok) {
    const text = await response.text();
    const parsed = parseMondayTokenErrorBody(text);
    console.error("Monday token exchange failed:", {
      status: response.status,
      error: parsed.error,
      errorDescription: parsed.errorDescription,
      redirectUri,
      authMode: extraHeaders?.Authorization ? "basic" : "body",
      body: text,
    });
    return {
      ok: false,
      error: parsed.error,
      errorDescription: parsed.errorDescription,
      status: response.status,
    };
  }

  return { ok: true, token: (await response.json()) as MondayTokenResponse };
}

async function exchangeMondayToken(body: URLSearchParams): Promise<MondayTokenExchangeResult> {
  const clientId = getMondayClientId();
  const clientSecret = getMondayClientSecret();
  const redirectUri = body.get("redirect_uri");

  logMondayTokenExchangeDiagnostics(redirectUri, clientId, clientSecret, "body");

  const primaryResult = await postMondayToken(body);
  if (primaryResult.ok || !shouldRetryMondayTokenWithBasicAuth(primaryResult)) {
    return primaryResult;
  }

  const code = body.get("code");
  if (!code || !redirectUri) {
    return primaryResult;
  }

  console.info("Monday token exchange retrying with Basic Auth credentials");
  logMondayTokenExchangeDiagnostics(redirectUri, clientId, clientSecret, "basic");

  // Monday requires client_id (and client_secret) in the form body even when using Basic Auth.
  const basicAuthBody = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    code,
  });

  const basicAuthHeader = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  return postMondayToken(basicAuthBody, {
    Authorization: `Basic ${basicAuthHeader}`,
  });
}

export async function exchangeMondayAuthorizationCode(input: {
  code: string;
  redirectUri: string;
}): Promise<MondayTokenExchangeResult> {
  const body = new URLSearchParams({
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
