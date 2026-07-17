import type { SupabaseClient } from "@supabase/supabase-js";
import { cache } from "react";
import { listOrganizationUserEventAssignmentsByOrg } from "@/lib/auth/event-assignments";
import { isInviteExpired } from "@/lib/auth/invite-constants";
import { mapOrganizationUserRow } from "@/lib/auth/mappers";
import { getAuthUser } from "@/lib/auth/queries";
import { createClient } from "@/lib/supabase/server";
import type {
  OrganizationMembership,
  OrganizationUser,
  OrganizationUserRow,
} from "@/types/auth";

async function getLatestOrganizationLegacyId(): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("organizations")
    .select("id")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return data?.id ?? null;
}

export const getActiveMembership = cache(
  async (): Promise<OrganizationMembership | null> => {
    const user = await getAuthUser();
    if (!user) {
      return null;
    }

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("organization_users")
      .select(
        `
        *,
        organization_roles ( name )
      `,
      )
      .eq("user_id", user.id)
      .eq("status", "active")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (error?.code === "42P01") {
      return null;
    }

    if (error || !data) {
      return null;
    }

    const row = data as OrganizationUserRow & {
      organization_roles: { name: string } | null;
    };

    return {
      organizationId: row.organization_id,
      user: mapOrganizationUserRow(
        row,
        row.organization_roles?.name ?? null,
      ),
    };
  },
);

export async function getOrganizationUsers(
  organizationId: string,
): Promise<OrganizationUser[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("organization_users")
    .select(
      `
      *,
      organization_roles ( name )
    `,
    )
    .eq("organization_id", organizationId)
    .order("status", { ascending: true })
    .order("email", { ascending: true });

  if (error?.code === "42P01") {
    return [];
  }

  if (error) {
    console.error("Failed to fetch organization users:", error.message);
    return [];
  }

  const assignmentsByUser =
    await listOrganizationUserEventAssignmentsByOrg(organizationId);

  return (data ?? []).map((row) => {
    const userRow = row as OrganizationUserRow & {
      organization_roles: { name: string } | null;
    };
    return mapOrganizationUserRow(
      userRow,
      userRow.organization_roles?.name ?? null,
      assignmentsByUser[userRow.id] ?? [],
    );
  });
}

export type InviteTokenLookup =
  | { status: "valid"; invite: OrganizationUser }
  | { status: "expired"; invite: OrganizationUser }
  | { status: "missing" };

export async function lookupInviteByToken(
  token: string,
): Promise<InviteTokenLookup> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("organization_users")
    .select(
      `
      *,
      organization_roles ( name )
    `,
    )
    .eq("invite_token", token)
    .eq("status", "invited")
    .maybeSingle();

  if (error || !data) {
    return { status: "missing" };
  }

  const row = data as OrganizationUserRow & {
    organization_roles: { name: string } | null;
  };
  const invite = mapOrganizationUserRow(
    row,
    row.organization_roles?.name ?? null,
  );

  if (isInviteExpired(invite.inviteExpiresAt)) {
    return { status: "expired", invite };
  }

  return { status: "valid", invite };
}

export async function getInviteByToken(
  token: string,
): Promise<OrganizationUser | null> {
  const lookup = await lookupInviteByToken(token);
  return lookup.status === "valid" ? lookup.invite : null;
}

export async function countActiveOrganizationUsers(
  organizationId: string,
): Promise<number> {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("organization_users")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", organizationId)
    .eq("status", "active");

  if (error) {
    return 0;
  }

  return count ?? 0;
}

export type AcceptInviteResult = {
  accepted: number;
  /** Present when an invite token was supplied but the signed-in email does not match. */
  emailMismatch?: string;
};

/**
 * Activates pending invites for a signed-in user.
 * Prefer claiming the invite token from the Accept link; fall back to email match.
 */
export async function acceptPendingInvitesForUser(
  userId: string,
  email: string,
  options?: { inviteToken?: string | null },
): Promise<AcceptInviteResult> {
  const supabase = await createClient();
  const now = new Date().toISOString();
  const normalizedEmail = email.trim();
  const inviteToken = options?.inviteToken?.trim() || null;

  if (inviteToken) {
    const invite = await getInviteByToken(inviteToken);
    if (invite) {
      if (invite.email.trim().toLowerCase() !== normalizedEmail.toLowerCase()) {
        return { accepted: 0, emailMismatch: invite.email };
      }

      const { data, error } = await supabase
        .from("organization_users")
        .update({
          user_id: userId,
          status: "active",
          joined_at: now,
          invite_token: null,
          invite_expires_at: null,
        })
        .eq("invite_token", inviteToken)
        .eq("status", "invited")
        .select("id");

      if (error) {
        console.error("Failed to accept invite by token:", error.message);
        return { accepted: 0 };
      }

      return { accepted: data?.length ?? 0 };
    }
  }

  const { data, error } = await supabase
    .from("organization_users")
    .update({
      user_id: userId,
      status: "active",
      joined_at: now,
      invite_token: null,
      invite_expires_at: null,
    })
    .eq("status", "invited")
    .ilike("email", normalizedEmail)
    .select("id");

  if (error) {
    console.error("Failed to accept invites:", error.message);
    return { accepted: 0 };
  }

  return { accepted: data?.length ?? 0 };
}

/** Returns null when organization_users is unavailable (legacy local dev). */
export async function hasActiveOrganizationMembership(
  supabase: SupabaseClient,
  userId: string,
): Promise<boolean | null> {
  const { data, error } = await supabase
    .from("organization_users")
    .select("id")
    .eq("user_id", userId)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  if (error?.code === "42P01") {
    return null;
  }

  if (error) {
    return false;
  }

  return Boolean(data);
}

export { getLatestOrganizationLegacyId };
