import "server-only";

import { refreshInboxScopesFromPageToken } from "@/lib/inbox/settings";
import {
  filterInboxRelevantScopes,
  hasFacebookCommentReplyScopes,
  missingFacebookCommentReplyScopes,
} from "@/lib/inbox/scopes";
import { debugToken } from "@/lib/meta-publishing/graph-api";
import type { MetaConnection, MetaConnectionRow } from "@/lib/meta-publishing/types";
import { createAdminClient } from "@/lib/supabase/admin";

export type MetaTokenHealthStatus = {
  tokenValid: boolean;
  tokenExpiresAt: string | null;
  tokenNeverExpires: boolean;
  tokenType: string | null;
  grantedScopes: string[];
  inboxRelevantScopes: string[];
  missingFacebookCommentReplyScopes: string[];
  facebookCommentReplyReady: boolean;
  /** True only when Meta reports the stored Page token is invalid or expired. */
  reconnectRequired: boolean;
  error: string | null;
};

function mapMetaConnectionRow(row: MetaConnectionRow): MetaConnection {
  return {
    id: row.id,
    organizationId: row.organization_id,
    facebookPageId: row.facebook_page_id,
    instagramAccountId: row.instagram_account_id,
    pageAccessToken: row.page_access_token,
    pageName: row.page_name,
    tokenExpiresAt: row.token_expires_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function inspectMetaPageToken(
  pageAccessToken: string,
): Promise<MetaTokenHealthStatus> {
  const debug = await debugToken({ inputToken: pageAccessToken });
  const inboxRelevantScopes = filterInboxRelevantScopes(debug.scopes);
  const missingReply = missingFacebookCommentReplyScopes(inboxRelevantScopes);
  const tokenNeverExpires = debug.isValid && !debug.expiresAt;

  return {
    tokenValid: debug.isValid,
    tokenExpiresAt: debug.expiresAt,
    tokenNeverExpires,
    tokenType: debug.tokenType,
    grantedScopes: debug.scopes,
    inboxRelevantScopes,
    missingFacebookCommentReplyScopes: missingReply,
    facebookCommentReplyReady: hasFacebookCommentReplyScopes(inboxRelevantScopes),
    reconnectRequired: !debug.isValid,
    error: debug.error,
  };
}

/** Page tokens from a long-lived user token never expire (debug_token expires_at is 0). */
export async function resolvePageTokenExpiresAt(
  pageAccessToken: string,
): Promise<string | null> {
  const debug = await debugToken({ inputToken: pageAccessToken });
  if (!debug.isValid || !debug.expiresAt) {
    return null;
  }

  return debug.expiresAt;
}

async function loadMetaConnectionAdmin(
  organizationId: string,
): Promise<MetaConnection | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("organization_meta_connections")
    .select("*")
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return mapMetaConnectionRow(data as MetaConnectionRow);
}

export async function ensureMetaConnectionHealthy(input: {
  organizationId: string;
  connection: MetaConnection;
}): Promise<MetaTokenHealthStatus & { connection: MetaConnection }> {
  const health = await inspectMetaPageToken(input.connection.pageAccessToken);

  await refreshInboxScopesFromPageToken({
    organizationId: input.organizationId,
    pageAccessToken: input.connection.pageAccessToken,
    enableSync: health.tokenValid,
  });

  const pageTokenExpiresAt = health.tokenNeverExpires ? null : health.tokenExpiresAt;
  let connection = input.connection;

  if (pageTokenExpiresAt !== input.connection.tokenExpiresAt) {
    const admin = createAdminClient();
    const now = new Date().toISOString();
    const { error } = await admin
      .from("organization_meta_connections")
      .update({
        token_expires_at: pageTokenExpiresAt,
        updated_at: now,
      })
      .eq("organization_id", input.organizationId);

    if (error) {
      console.warn(
        `Could not persist token_expires_at for org ${input.organizationId}:`,
        error.message,
      );
    } else {
      connection = { ...connection, tokenExpiresAt: pageTokenExpiresAt, updatedAt: now };
    }
  }

  return { ...health, connection };
}

export async function ensureMetaConnectionHealthyForOrganization(
  organizationId: string,
): Promise<(MetaTokenHealthStatus & { connection: MetaConnection }) | null> {
  const connection = await loadMetaConnectionAdmin(organizationId);
  if (!connection?.pageAccessToken) {
    return null;
  }

  return ensureMetaConnectionHealthy({ organizationId, connection });
}

export async function refreshAllMetaConnectionHealth(): Promise<{
  organizationsProcessed: number;
  results: Array<{
    organizationId: string;
    tokenValid: boolean;
    reconnectRequired: boolean;
  }>;
}> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("organization_meta_connections")
    .select("organization_id");

  if (error || !data) {
    return { organizationsProcessed: 0, results: [] };
  }

  const results: Array<{
    organizationId: string;
    tokenValid: boolean;
    reconnectRequired: boolean;
  }> = [];

  for (const row of data) {
    const organizationId = row.organization_id as string;
    const refreshed = await ensureMetaConnectionHealthyForOrganization(organizationId);
    results.push({
      organizationId,
      tokenValid: refreshed?.tokenValid ?? false,
      reconnectRequired: refreshed?.reconnectRequired ?? true,
    });
  }

  return {
    organizationsProcessed: results.length,
    results,
  };
}
