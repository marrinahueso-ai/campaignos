"use server";

import { revalidatePath } from "next/cache";
import { hasPermission } from "@/lib/access-templates/effective-access";
import { listCanvaDesigns } from "@/lib/canva/api-client";
import {
  disconnectCanvaConnection,
  getCanvaConnectionForCurrentOrg,
  getValidCanvaAccessToken,
  isCanvaConnectionConfigured,
} from "@/lib/canva/connection";
import { isCanvaIntegrationConfigured } from "@/lib/canva/config";
import { getLatestOrganization } from "@/lib/organizations/queries";
import type { CanvaDesignSummary } from "@/lib/canva/types";

export type CanvaActionResult = {
  success: boolean;
  error?: string | null;
};

export async function getCanvaConnectionStatusAction(): Promise<{
  configured: boolean;
  connected: boolean;
}> {
  return {
    configured: isCanvaIntegrationConfigured(),
    connected: isCanvaConnectionConfigured(await getCanvaConnectionForCurrentOrg()),
  };
}

export async function listCanvaDesignsAction(): Promise<{
  success: boolean;
  error?: string | null;
  designs?: CanvaDesignSummary[];
}> {
  if (!(await hasPermission("upload_artwork"))) {
    return { success: false, error: "You do not have permission to browse Canva designs." };
  }

  if (!isCanvaIntegrationConfigured()) {
    return {
      success: false,
      error: "Canva integration is not configured. Add CANVA_CLIENT_ID and CANVA_CLIENT_SECRET.",
    };
  }

  const connection = await getCanvaConnectionForCurrentOrg();
  if (!isCanvaConnectionConfigured(connection)) {
    return { success: false, error: "Connect Canva in Settings first." };
  }

  const accessToken = await getValidCanvaAccessToken(connection);
  if (!accessToken) {
    return {
      success: false,
      error: "Canva session expired. Reconnect in Settings → Canva.",
    };
  }

  const designs = await listCanvaDesigns(accessToken);
  return { success: true, designs };
}

export async function disconnectCanvaConnectionAction(): Promise<CanvaActionResult> {
  if (!(await hasPermission("upload_artwork"))) {
    return { success: false, error: "You do not have permission to disconnect Canva." };
  }

  const organization = await getLatestOrganization();
  if (!organization) {
    return { success: false, error: "Organization not found." };
  }

  const ok = await disconnectCanvaConnection(organization.id);
  if (!ok) {
    return { success: false, error: "Could not disconnect Canva." };
  }

  revalidatePath("/settings/canva");
  return { success: true };
}
