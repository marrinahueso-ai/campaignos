import "server-only";

import { getLatestOrganization } from "@/lib/organizations/queries";
import { createClient } from "@/lib/supabase/server";
import {
  CANVA_TOKEN_URL,
  getCanvaBasicAuthHeader,
  getCanvaClientId,
} from "@/lib/canva/config";
import type { CanvaConnection, CanvaConnectionRow, CanvaTokenResponse } from "@/lib/canva/types";

function mapCanvaConnectionRow(row: CanvaConnectionRow): CanvaConnection {
  return {
    id: row.id,
    organizationId: row.organization_id,
    accessToken: row.access_token,
    refreshToken: row.refresh_token,
    tokenExpiresAt: row.token_expires_at,
    scopes: row.scopes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getCanvaConnectionForOrganization(
  organizationId: string,
): Promise<CanvaConnection | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("organization_canva_connections")
    .select("*")
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return mapCanvaConnectionRow(data as CanvaConnectionRow);
}

export async function getCanvaConnectionForCurrentOrg(): Promise<CanvaConnection | null> {
  const organization = await getLatestOrganization();
  if (!organization) {
    return null;
  }
  return getCanvaConnectionForOrganization(organization.id);
}

export function isCanvaConnectionConfigured(
  connection: CanvaConnection | null,
): connection is CanvaConnection {
  return Boolean(connection?.accessToken && connection.refreshToken);
}

async function exchangeCanvaToken(
  body: URLSearchParams,
): Promise<CanvaTokenResponse | null> {
  const response = await fetch(CANVA_TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: getCanvaBasicAuthHeader(),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  if (!response.ok) {
    const text = await response.text();
    console.error("Canva token exchange failed:", response.status, text);
    return null;
  }

  return (await response.json()) as CanvaTokenResponse;
}

export async function saveCanvaConnectionFromTokenResponse(
  organizationId: string,
  token: CanvaTokenResponse,
): Promise<boolean> {
  const expiresAt = new Date(Date.now() + token.expires_in * 1000).toISOString();
  const supabase = await createClient();
  const now = new Date().toISOString();

  const { error } = await supabase.from("organization_canva_connections").upsert(
    {
      organization_id: organizationId,
      access_token: token.access_token,
      refresh_token: token.refresh_token,
      token_expires_at: expiresAt,
      scopes: token.scope ?? null,
      updated_at: now,
    },
    { onConflict: "organization_id" },
  );

  if (error) {
    console.error("Failed to save Canva connection:", error.message);
    return false;
  }

  return true;
}

export async function exchangeCanvaAuthorizationCode(input: {
  code: string;
  codeVerifier: string;
  redirectUri: string;
}): Promise<CanvaTokenResponse | null> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code: input.code,
    code_verifier: input.codeVerifier,
    redirect_uri: input.redirectUri,
    client_id: getCanvaClientId(),
  });

  return exchangeCanvaToken(body);
}

async function refreshCanvaAccessToken(
  refreshToken: string,
): Promise<CanvaTokenResponse | null> {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });

  return exchangeCanvaToken(body);
}

export async function getValidCanvaAccessToken(
  connection: CanvaConnection,
): Promise<string | null> {
  const expiresAt = new Date(connection.tokenExpiresAt).getTime();
  const refreshBufferMs = 5 * 60 * 1000;

  if (Date.now() < expiresAt - refreshBufferMs) {
    return connection.accessToken;
  }

  const refreshed = await refreshCanvaAccessToken(connection.refreshToken);
  if (!refreshed) {
    return null;
  }

  const saved = await saveCanvaConnectionFromTokenResponse(
    connection.organizationId,
    refreshed,
  );

  return saved ? refreshed.access_token : null;
}

export async function disconnectCanvaConnection(
  organizationId: string,
): Promise<boolean> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("organization_canva_connections")
    .delete()
    .eq("organization_id", organizationId);

  return !error || error.code === "42P01";
}
