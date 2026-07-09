import "server-only";

import { cache } from "react";
import { getCampaignBuilderCampaignOptions } from "@/lib/campaign-builder-v2/campaign-options";
import { getPlaybooksForOrganization } from "@/lib/playbooks/queries";
import type { Event } from "@/types";

/** Per-request cached playbooks for the campaign builder dropdown. */
export const getCachedPlaybooksForOrganization = cache(getPlaybooksForOrganization);

/** Per-request cached campaign name dropdown options. */
export const getCachedCampaignBuilderCampaignOptions = cache(
  async (organizationId: string | null, currentEvent: Event) =>
    getCampaignBuilderCampaignOptions(organizationId, currentEvent),
);
