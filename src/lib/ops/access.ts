import "server-only";

import { canManageDeveloperAgreements } from "@/lib/developer-agreements/access";

/**
 * Platform owner ops (`/ops`, agreements manage / counter-sign).
 * Same gate: allowlisted email + Owner (admin) campaign role.
 */
export async function canAccessOwnerOps(): Promise<boolean> {
  return canManageDeveloperAgreements();
}
