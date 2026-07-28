"use server";

import { headers } from "next/headers";
import { getAuthUser } from "@/lib/auth/queries";
import { getCurrentOrganization } from "@/lib/auth/organization-context";
import { prepareHomepageStateForShare } from "@/lib/homepage-composer/prepare-state-for-share";
import {
  createHomepageComposerShareToken,
  insertHomepageComposerShare,
} from "@/lib/homepage-composer/share-queries";
import type {
  CreateHomepageComposerShareInput,
  CreateHomepageComposerShareResult,
} from "@/lib/homepage-composer/share-types";
import { homepageComposerShareUrl } from "@/lib/homepage-composer/share-url";
import { resolveSiteUrlFromHeaders } from "@/lib/site/url";

export async function createHomepageComposerShareAction(
  input: CreateHomepageComposerShareInput,
): Promise<CreateHomepageComposerShareResult> {
  const organization = await getCurrentOrganization();
  if (!organization?.id) {
    return { success: false, error: "Sign in to share a preview link." };
  }

  const user = await getAuthUser();
  const prepared = await prepareHomepageStateForShare(input.state);
  if (prepared.error) {
    return { success: false, error: prepared.error };
  }

  const title =
    (prepared.state.header.title || "Homepage preview").trim() ||
    "Homepage preview";
  const previewMode = input.previewMode ?? "full_month";
  const asOfDate =
    previewMode === "as_of_date" ? (input.asOfDate?.trim() || null) : null;
  const includeVisibilityMemos = input.includeVisibilityMemos ?? true;
  const shareStatus = input.shareStatus ?? "shared";
  const token = createHomepageComposerShareToken();

  const inserted = await insertHomepageComposerShare({
    token,
    organizationId: organization.id,
    createdBy: user?.id ?? null,
    title,
    composerState: prepared.state,
    previewMode,
    asOfDate,
    includeVisibilityMemos,
    shareStatus,
  });

  if ("error" in inserted) {
    return { success: false, error: inserted.error };
  }

  const headerStore = await headers();
  const siteOrigin = resolveSiteUrlFromHeaders(
    headerStore.get("x-forwarded-host") ?? headerStore.get("host"),
    headerStore.get("x-forwarded-proto"),
  );

  return {
    success: true,
    token: inserted.token,
    url: homepageComposerShareUrl(siteOrigin, inserted.token),
  };
}
