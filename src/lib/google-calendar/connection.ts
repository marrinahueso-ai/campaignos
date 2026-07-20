import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  GOOGLE_OAUTH_TOKEN_URL,
  GOOGLE_USERINFO_URL,
  getGoogleClientId,
  getGoogleClientSecret,
} from "@/lib/google-calendar/config";
import type {
  GoogleCalendarConnection,
  GoogleCalendarConnectionRow,
  GoogleTokenResponse,
} from "@/lib/google-calendar/types";
import { getLatestOrganization } from "@/lib/organizations/queries";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export function mapGoogleCalendarConnectionRow(
  row: GoogleCalendarConnectionRow,
): GoogleCalendarConnection {
  return {
    id: row.id,
    organizationId: row.organization_id,
    accessToken: row.access_token,
    refreshToken: row.refresh_token,
    tokenExpiresAt: row.token_expires_at,
    scopes: row.scopes,
    googleAccountEmail: row.google_account_email,
    googleCalendarId: row.google_calendar_id || "primary",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function resolveDbClient(
  client?: SupabaseClient,
): Promise<SupabaseClient> {
  return client ?? (await createClient());
}

export async function getGoogleCalendarConnectionForOrganization(
  organizationId: string,
  client?: SupabaseClient,
): Promise<GoogleCalendarConnection | null> {
  const supabase = await resolveDbClient(client);
  const { data, error } = await supabase
    .from("organization_google_calendar_connections")
    .select("*")
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return mapGoogleCalendarConnectionRow(data as GoogleCalendarConnectionRow);
}

export async function getGoogleCalendarConnectionForCurrentOrg(): Promise<GoogleCalendarConnection | null> {
  const organization = await getLatestOrganization();
  if (!organization) {
    return null;
  }
  return getGoogleCalendarConnectionForOrganization(organization.id);
}

export function isGoogleCalendarConnectionConfigured(
  connection: GoogleCalendarConnection | null,
): connection is GoogleCalendarConnection {
  return Boolean(connection?.accessToken && connection.refreshToken);
}

async function exchangeGoogleToken(
  body: URLSearchParams,
): Promise<GoogleTokenResponse | null> {
  const response = await fetch(GOOGLE_OAUTH_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!response.ok) {
    const text = await response.text();
    console.error("Google token exchange failed:", response.status, text);
    return null;
  }

  return (await response.json()) as GoogleTokenResponse;
}

export async function exchangeGoogleAuthorizationCode(input: {
  code: string;
  redirectUri: string;
}): Promise<GoogleTokenResponse | null> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code: input.code,
    redirect_uri: input.redirectUri,
    client_id: getGoogleClientId(),
    client_secret: getGoogleClientSecret(),
  });
  return exchangeGoogleToken(body);
}

export async function fetchGoogleAccountEmail(
  accessToken: string,
): Promise<string | null> {
  try {
    const response = await fetch(GOOGLE_USERINFO_URL, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok) {
      return null;
    }
    const data = (await response.json()) as { email?: string };
    return data.email?.trim() || null;
  } catch {
    return null;
  }
}

export async function saveGoogleCalendarConnectionFromTokenResponse(
  organizationId: string,
  token: GoogleTokenResponse,
  options?: {
    googleAccountEmail?: string | null;
    previousRefreshToken?: string;
    client?: SupabaseClient;
  },
): Promise<boolean> {
  const refreshToken =
    token.refresh_token?.trim() || options?.previousRefreshToken?.trim();
  if (!refreshToken) {
    console.error("Google OAuth response missing refresh_token.");
    return false;
  }

  const expiresAt = new Date(Date.now() + token.expires_in * 1000).toISOString();
  const supabase = await resolveDbClient(options?.client);
  const now = new Date().toISOString();

  const { error } = await supabase
    .from("organization_google_calendar_connections")
    .upsert(
      {
        organization_id: organizationId,
        access_token: token.access_token,
        refresh_token: refreshToken,
        token_expires_at: expiresAt,
        scopes: token.scope ?? null,
        google_account_email: options?.googleAccountEmail ?? null,
        google_calendar_id: "primary",
        updated_at: now,
      },
      { onConflict: "organization_id" },
    );

  if (error) {
    console.error("Failed to save Google Calendar connection:", error.message);
    return false;
  }

  return true;
}

export async function getValidGoogleAccessToken(
  connection: GoogleCalendarConnection,
  options?: { client?: SupabaseClient; useServiceRole?: boolean },
): Promise<string | null> {
  const expiresAt = new Date(connection.tokenExpiresAt).getTime();
  const skewMs = 60_000;
  if (Number.isFinite(expiresAt) && expiresAt - skewMs > Date.now()) {
    return connection.accessToken;
  }

  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: connection.refreshToken,
    client_id: getGoogleClientId(),
    client_secret: getGoogleClientSecret(),
  });

  const token = await exchangeGoogleToken(body);
  if (!token?.access_token) {
    return null;
  }

  const client =
    options?.client ??
    (options?.useServiceRole ? createAdminClient() : undefined);

  const saved = await saveGoogleCalendarConnectionFromTokenResponse(
    connection.organizationId,
    token,
    {
      googleAccountEmail: connection.googleAccountEmail,
      previousRefreshToken: connection.refreshToken,
      client,
    },
  );

  return saved ? token.access_token : null;
}

export async function disconnectGoogleCalendarConnection(
  organizationId: string,
): Promise<boolean> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("organization_google_calendar_connections")
    .delete()
    .eq("organization_id", organizationId);

  if (error) {
    console.error("Failed to disconnect Google Calendar:", error.message);
    return false;
  }
  return true;
}
