import "server-only";

import { hasPermission } from "@/lib/access-templates/effective-access";
import { getLatestOrganization } from "@/lib/organizations/queries";

export async function requireGiphyProxyAccess(): Promise<
  { ok: true; organizationId: string } | { ok: false; status: number; error: string }
> {
  if (!(await hasPermission("upload_artwork"))) {
    return { ok: false, status: 403, error: "You do not have permission to use inbox GIFs." };
  }

  const organization = await getLatestOrganization();
  if (!organization?.id) {
    return { ok: false, status: 401, error: "Set up your organization first." };
  }

  return { ok: true, organizationId: organization.id };
}
