"use server";

import { revalidatePath } from "next/cache";
import { getCurrentCampaignRole } from "@/lib/auth/get-current-role";
import { hasPermission } from "@/lib/access-templates/effective-access";
import { getLatestOrganization } from "@/lib/organizations/queries";
import { pickBestPageFromTokenResult } from "@/lib/meta-publishing/connection-token-select";
import { resolvePageTokenExpiresAt } from "@/lib/meta-publishing/connection-token-health";
import { refreshInboxScopesFromPageToken } from "@/lib/inbox/settings";
import {
  verifyMetaConnection,
  exchangeShortLivedForLongLived,
  fetchPagesFromUserToken,
  type ResolvedMetaPage,
} from "@/lib/meta-publishing/graph-api";
import { createClient } from "@/lib/supabase/server";

export type MetaConnectionActionResult = {
  success: boolean;
  error?: string | null;
  pageName?: string | null;
};

export async function saveMetaConnectionAction(input: {
  facebookPageId: string;
  instagramAccountId: string;
  pageAccessToken: string;
}): Promise<MetaConnectionActionResult> {
  if (!(await hasPermission("publish_social"))) {
    return { success: false, error: "You do not have permission to connect Meta." };
  }

  const organization = await getLatestOrganization();
  if (!organization) {
    return { success: false, error: "Set up your organization first." };
  }

  const pageId = input.facebookPageId.trim();
  const igId = input.instagramAccountId.trim();
  const token = input.pageAccessToken.trim();

  if (!pageId || !token) {
    return { success: false, error: "Page ID and access token are required." };
  }

  const verified = await verifyMetaConnection({
    pageId,
    instagramAccountId: igId || undefined,
    accessToken: token,
  });

  if (!verified.ok) {
    return { success: false, error: verified.error ?? "Could not verify Meta connection." };
  }

  const supabase = await createClient();
  const now = new Date().toISOString();

  const { error } = await supabase.from("organization_meta_connections").upsert(
    {
      organization_id: organization.id,
      facebook_page_id: pageId,
      instagram_account_id: igId || "",
      page_access_token: token,
      page_name: verified.pageName,
      token_expires_at: null,
      updated_at: now,
    },
    { onConflict: "organization_id" },
  );

  if (error) {
    if (error.code === "42P01") {
      return {
        success: false,
        error: "Meta connection storage is not set up. Run database migration 021.",
      };
    }
    return { success: false, error: error.message };
  }

  await refreshInboxScopesFromPageToken({
    organizationId: organization.id,
    pageAccessToken: token,
    enableSync: true,
  });

  revalidatePath("/settings/meta");
  return { success: true, pageName: verified.pageName };
}

export async function disconnectMetaConnectionAction(): Promise<MetaConnectionActionResult> {
  if (!(await hasPermission("publish_social"))) {
    return { success: false, error: "You do not have permission to disconnect Meta." };
  }

  const organization = await getLatestOrganization();
  if (!organization) {
    return { success: false, error: "Organization not found." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("organization_meta_connections")
    .delete()
    .eq("organization_id", organization.id);

  if (error && error.code !== "42P01") {
    return { success: false, error: error.message };
  }

  revalidatePath("/settings/meta");
  return { success: true };
}

export async function saveMetaConnectionFromOAuth(input: {
  organizationId: string;
  pages: ResolvedMetaPage[];
  preferredPageId?: string;
}): Promise<{ success: boolean; errorCode?: string; pageName?: string | null }> {
  const page = await pickBestPageFromTokenResult(input.pages, input.preferredPageId);
  if (!page) {
    return { success: false, errorCode: "no_pages" };
  }

  const verified = await verifyMetaConnection({
    pageId: page.id,
    instagramAccountId: page.instagramAccountId ?? undefined,
    accessToken: page.accessToken,
  });

  if (!verified.ok) {
    return { success: false, errorCode: "verify_failed" };
  }

  const tokenExpiresAt = await resolvePageTokenExpiresAt(page.accessToken);
  const supabase = await createClient();
  const now = new Date().toISOString();

  const { error } = await supabase.from("organization_meta_connections").upsert(
    {
      organization_id: input.organizationId,
      facebook_page_id: page.id,
      instagram_account_id: page.instagramAccountId ?? "",
      page_access_token: page.accessToken,
      page_name: verified.pageName ?? page.name,
      token_expires_at: tokenExpiresAt,
      updated_at: now,
    },
    { onConflict: "organization_id" },
  );

  if (error) {
    if (error.code === "42P01") {
      return { success: false, errorCode: "migration_required" };
    }
    return { success: false, errorCode: "save_failed" };
  }

  await refreshInboxScopesFromPageToken({
    organizationId: input.organizationId,
    pageAccessToken: page.accessToken,
    enableSync: true,
  });

  revalidatePath("/settings/meta");
  return { success: true, pageName: verified.pageName ?? page.name };
}

export async function connectMetaWithUserTokenAction(input: {
  userAccessToken: string;
  preferredPageId?: string;
}): Promise<MetaConnectionActionResult & { pageId?: string; hasInstagram?: boolean }> {
  try {
    const role = await getCurrentCampaignRole();
    if (!(await hasPermission("publish_social"))) {
      return { success: false, error: "You do not have permission to connect Meta." };
    }

    const organization = await getLatestOrganization();
    if (!organization) {
      return { success: false, error: "Set up your organization first." };
    }

    const token = input.userAccessToken.trim();
    if (!token) {
      return { success: false, error: "Paste the access token from Graph API Explorer." };
    }

    const longLived = await exchangeShortLivedForLongLived({ shortLivedToken: token });
    const userToken = longLived.accessToken ?? token;

    const { pages, error } = await fetchPagesFromUserToken(userToken, {
      fallbackPageIds: input.preferredPageId?.trim()
        ? [input.preferredPageId.trim()]
        : undefined,
      alternateTokens: longLived.accessToken ? [token] : undefined,
    });
    if (error) {
      return { success: false, error };
    }

    const page = await pickBestPageFromTokenResult(pages, input.preferredPageId?.trim());
    if (!page) {
      return { success: false, error: "Could not find a Facebook Page for this token." };
    }

    const verified = await verifyMetaConnection({
      pageId: page.id,
      instagramAccountId: page.instagramAccountId ?? undefined,
      accessToken: page.accessToken,
    });

    if (!verified.ok) {
      return { success: false, error: verified.error ?? "Could not verify Meta connection." };
    }

    const tokenExpiresAt = await resolvePageTokenExpiresAt(page.accessToken);
    const supabase = await createClient();
    const now = new Date().toISOString();

    const { error: saveError } = await supabase.from("organization_meta_connections").upsert(
      {
        organization_id: organization.id,
        facebook_page_id: page.id,
        instagram_account_id: page.instagramAccountId ?? "",
        page_access_token: page.accessToken,
        page_name: verified.pageName ?? page.name,
        token_expires_at: tokenExpiresAt,
        updated_at: now,
      },
      { onConflict: "organization_id" },
    );

    if (saveError) {
      if (saveError.code === "42P01") {
        return {
          success: false,
          error: "Meta connection storage is not set up. Run database migration 021.",
        };
      }
      return { success: false, error: saveError.message };
    }

    await refreshInboxScopesFromPageToken({
      organizationId: organization.id,
      pageAccessToken: page.accessToken,
      enableSync: true,
    });

    revalidatePath("/settings/meta");
    return {
      success: true,
      pageName: verified.pageName ?? page.name,
      pageId: page.id,
      hasInstagram: Boolean(page.instagramAccountId),
    };
  } catch (cause) {
    console.error("connectMetaWithUserTokenAction failed:", cause);
    return {
      success: false,
      error:
        cause instanceof Error
          ? cause.message
          : "Unexpected error connecting Meta. Try again in a moment.",
    };
  }
}
