import "server-only";

import { canManageDeveloperAgreements } from "@/lib/developer-agreements/access";

/** Platform owner ops (Hey Ralli internal dashboard). */
export async function canAccessOwnerOps(): Promise<boolean> {
  return canManageDeveloperAgreements();
}
