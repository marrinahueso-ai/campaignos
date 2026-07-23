import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/**
 * Cookie/session client for interactive requests, or service-role for crons/jobs.
 * Cron handlers must use useServiceRole — RLS requires membership and there is no user session.
 */
export async function createJobClient(
  useServiceRole = false,
): Promise<SupabaseClient> {
  if (useServiceRole) {
    return createAdminClient();
  }
  return createClient();
}
