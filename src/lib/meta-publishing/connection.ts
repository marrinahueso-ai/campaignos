import { createClient } from "@/lib/supabase/server";
import { getLatestOrganization } from "@/lib/organizations/queries";
import type { MetaConnection, MetaConnectionRow } from "@/lib/meta-publishing/types";
import {
  isInstagramPublishingConfigured,
  isMetaConnectionConfigured,
} from "@/lib/meta-publishing/connection-utils";

export { isInstagramPublishingConfigured, isMetaConnectionConfigured };

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

function connectionFromEnv(): MetaConnection | null {
  const pageId = process.env.META_FACEBOOK_PAGE_ID?.trim();
  const token = process.env.META_PAGE_ACCESS_TOKEN?.trim();

  if (!pageId || !token) {
    return null;
  }

  const igId = process.env.META_INSTAGRAM_ACCOUNT_ID?.trim() ?? "";

  return {
    id: "env",
    organizationId: "env",
    facebookPageId: pageId,
    instagramAccountId: igId,
    pageAccessToken: token,
    pageName: process.env.META_PAGE_NAME?.trim() ?? "Facebook Page",
    tokenExpiresAt: null,
    createdAt: "",
    updatedAt: "",
  };
}

export async function getMetaConnectionForOrganization(
  organizationId: string | null,
): Promise<MetaConnection | null> {
  if (organizationId) {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("organization_meta_connections")
      .select("*")
      .eq("organization_id", organizationId)
      .maybeSingle();

    if (!error && data) {
      return mapMetaConnectionRow(data as MetaConnectionRow);
    }
  }

  return connectionFromEnv();
}

export async function getMetaConnectionForCurrentOrg(): Promise<MetaConnection | null> {
  const organization = await getLatestOrganization();
  return getMetaConnectionForOrganization(organization?.id ?? null);
}

export async function refreshOrganizationInstagramAccountId(input: {
  organizationId: string;
  facebookPageId: string;
  pageAccessToken: string;
  instagramAccountId: string;
}): Promise<string> {
  const { resolveLinkedInstagramForPage } = await import(
    "@/lib/meta-publishing/graph-api"
  );

  const resolved = await resolveLinkedInstagramForPage({
    pageId: input.facebookPageId,
    accessToken: input.pageAccessToken,
  });

  const linked = resolved.instagramAccountId?.trim() ?? "";
  const current = input.instagramAccountId.trim();

  if (!linked) {
    if (resolved.error) {
      console.warn(
        `Could not refresh Instagram account for org ${input.organizationId}:`,
        resolved.error,
      );
    }
    return current;
  }

  if (linked === current) {
    return current;
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("organization_meta_connections")
    .update({
      instagram_account_id: linked,
      updated_at: new Date().toISOString(),
    })
    .eq("organization_id", input.organizationId);

  if (error) {
    console.warn(
      `Could not persist refreshed Instagram account ID for org ${input.organizationId}:`,
      error.message,
    );
    return linked;
  }

  console.info(
    `Refreshed Instagram account ID for org ${input.organizationId}: ${current || "(empty)"} -> ${linked}`,
  );
  return linked;
}
