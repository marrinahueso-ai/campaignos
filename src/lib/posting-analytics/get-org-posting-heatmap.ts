import "server-only";

import { computePostingHeatmap } from "@/lib/posting-analytics/compute-heatmap";
import { fetchPublishedPostTimestamps } from "@/lib/posting-analytics/fetch-publish-history";
import type { PostingHeatmapData } from "@/lib/posting-analytics/types";
import {
  getStoredMetaConnectionForOrganization,
  isMetaConnectionConfigured,
} from "@/lib/meta-publishing/connection";
import { getLatestOrganization } from "@/lib/organizations/queries";

export async function getOrgPostingHeatmap(): Promise<PostingHeatmapData | null> {
  const organization = await getLatestOrganization();
  if (!organization) {
    return null;
  }

  const orgMeta = await getStoredMetaConnectionForOrganization(organization.id);
  if (!isMetaConnectionConfigured(orgMeta)) {
    return null;
  }

  const publishedAtTimestamps = await fetchPublishedPostTimestamps();

  return computePostingHeatmap({
    timezone: organization.timezone ?? "America/Chicago",
    preferredPostingHours: organization.preferredPostingHours ?? null,
    publishedAtTimestamps,
  });
}
