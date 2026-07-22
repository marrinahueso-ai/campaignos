import type { SupabaseClient } from "@supabase/supabase-js";

export const DEVELOPER_AGREEMENTS_PATH = "/account/agreements";
export const DEVELOPER_AGREEMENTS_MANAGE_PATH = "/account/agreements/manage";

/** Active campaign roles for a user across all active memberships. */
export async function getActiveCampaignRolesForUser(
  supabase: SupabaseClient,
  userId: string,
): Promise<string[]> {
  const { data, error } = await supabase
    .from("organization_users")
    .select("campaign_role")
    .eq("user_id", userId)
    .eq("status", "active");

  if (error || !data?.length) {
    return [];
  }

  return [
    ...new Set(
      data
        .map((row) => String(row.campaign_role ?? "").trim())
        .filter(Boolean),
    ),
  ];
}

function rolesRequireDocument(
  userRoles: string[],
  requiredForRoles: string[],
): boolean {
  if (!userRoles.length || !requiredForRoles.length) {
    return false;
  }
  return requiredForRoles.some((role) => userRoles.includes(role));
}

/**
 * Whether this user must complete developer agreements before app access.
 * Lightweight for middleware: true if any required current version is unsigned.
 */
export async function userMustSignDeveloperAgreements(
  supabase: SupabaseClient,
  userId: string,
): Promise<boolean> {
  const roles = await getActiveCampaignRolesForUser(supabase, userId);
  if (!roles.length) {
    return false;
  }

  const { data: documents, error } = await supabase
    .from("developer_agreement_documents")
    .select("id, required_for_roles, current_version_id, is_active")
    .eq("is_active", true);

  if (error) {
    // Table missing in local/legacy — do not block the app.
    if (error.code === "42P01") {
      return false;
    }
    console.error("developer agreements gate query failed:", error.message);
    return false;
  }

  if (!documents?.length) {
    return false;
  }

  const requiredVersionIds = documents
    .filter(
      (doc) =>
        doc.current_version_id &&
        rolesRequireDocument(
          roles,
          (doc.required_for_roles as string[] | null) ?? ["developer"],
        ),
    )
    .map((doc) => doc.current_version_id as string);

  if (!requiredVersionIds.length) {
    return false;
  }

  const { data: signatures, error: sigError } = await supabase
    .from("developer_agreement_signatures")
    .select("version_id")
    .eq("user_id", userId)
    .in("version_id", requiredVersionIds);

  if (sigError) {
    if (sigError.code === "42P01") {
      return false;
    }
    console.error(
      "developer agreements signatures query failed:",
      sigError.message,
    );
    return false;
  }

  const signed = new Set((signatures ?? []).map((row) => row.version_id));
  return requiredVersionIds.some((versionId) => !signed.has(versionId));
}
