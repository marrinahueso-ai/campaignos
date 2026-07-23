import { createJobClient } from "@/lib/supabase/job-client";
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

export type MetaConnectionLookupOptions = {
  /** Bypass RLS — required for Vercel cron / service jobs with no user session. */
  useServiceRole?: boolean;
};

/** Org-scoped Meta row only — never falls back to shared env credentials. */
export async function getStoredMetaConnectionForOrganization(
  organizationId: string | null,
  options?: MetaConnectionLookupOptions,
): Promise<MetaConnection | null> {
  if (!organizationId) {
    return null;
  }

  const supabase = await createJobClient(Boolean(options?.useServiceRole));
  const { data, error } = await supabase
    .from("organization_meta_connections")
    .select("*")
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return mapMetaConnectionRow(data as MetaConnectionRow);
}

export async function getMetaConnectionForOrganization(
  organizationId: string | null,
  options?: MetaConnectionLookupOptions,
): Promise<MetaConnection | null> {
  const stored = await getStoredMetaConnectionForOrganization(
    organizationId,
    options,
  );
  if (stored) {
    return stored;
  }

  return connectionFromEnv();
}

/** event → school_year → organization_id (no signed-in membership required). */
export async function getOrganizationIdForEvent(
  eventId: string,
  options?: MetaConnectionLookupOptions,
): Promise<string | null> {
  const supabase = await createJobClient(Boolean(options?.useServiceRole));
  const { data: event, error: eventError } = await supabase
    .from("events")
    .select("school_year_id")
    .eq("id", eventId)
    .maybeSingle();

  if (eventError || !event?.school_year_id) {
    return null;
  }

  const { data: schoolYear, error: yearError } = await supabase
    .from("school_years")
    .select("organization_id")
    .eq("id", event.school_year_id as string)
    .maybeSingle();

  if (yearError || !schoolYear?.organization_id) {
    return null;
  }

  return schoolYear.organization_id as string;
}

/** Cron-safe: resolve org Meta OAuth from the event's school year, not session org. */
export async function getMetaConnectionForEvent(
  eventId: string,
  options?: MetaConnectionLookupOptions,
): Promise<MetaConnection | null> {
  const organizationId = await getOrganizationIdForEvent(eventId, options);
  return getMetaConnectionForOrganization(organizationId, options);
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

  const supabase = await createJobClient(false);
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
