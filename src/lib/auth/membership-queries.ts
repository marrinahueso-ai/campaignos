import type { SupabaseClient } from "@supabase/supabase-js";
import { cache } from "react";
import {
  normalizeOrganizationId,
  resolveActiveOrganizationId,
  type ActiveOrganizationOption,
} from "@/lib/auth/active-organization";
import { readActiveOrganizationCookie } from "@/lib/auth/active-organization-cookie";
import { listOrganizationUserEventAssignmentsByOrg } from "@/lib/auth/event-assignments";
import {
  resolveOrganizationAccessState,
  type OrganizationAccessState,
} from "@/lib/auth/membership-access";
import { isInviteExpired } from "@/lib/auth/invite-constants";
import { mapOrganizationUserRow } from "@/lib/auth/mappers";
import { getAuthUser } from "@/lib/auth/queries";
import { createClient } from "@/lib/supabase/server";
import type {
  OrganizationMembership,
  OrganizationUser,
  OrganizationUserRow,
} from "@/types/auth";

export type { ActiveOrganizationOption };

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

type ActiveMembershipRow = OrganizationUserRow & {
  organization_roles: { name: string } | null;
  organizations:
    | { id: string; name: string }
    | { id: string; name: string }[]
    | null;
};

function organizationFromJoin(
  organizations: ActiveMembershipRow["organizations"],
): { id: string; name: string } | null {
  if (!organizations) {
    return null;
  }
  if (Array.isArray(organizations)) {
    return organizations[0] ?? null;
  }
  return organizations;
}

/**
 * All active memberships for the signed-in user (oldest first).
 * Used for org switcher + active-org resolution. Never returns another
 * user's memberships — always filtered by auth.uid().
 */
export const listActiveMemberships = cache(
  async (): Promise<ActiveOrganizationOption[]> => {
    const user = await getAuthUser();
    if (!user) {
      return [];
    }

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("organization_users")
      .select(
        `
        organization_id,
        campaign_role,
        created_at,
        organizations ( id, name ),
        organization_roles ( name )
      `,
      )
      .eq("user_id", user.id)
      .eq("status", "active")
      .order("created_at", { ascending: true });

    if (error?.code === "42P01") {
      return [];
    }

    if (error) {
      console.error("Failed to list active memberships:", error.message);
      return [];
    }

    const options: ActiveOrganizationOption[] = [];
    for (const raw of data ?? []) {
      const row = raw as unknown as ActiveMembershipRow;
      const orgId = normalizeOrganizationId(row.organization_id);
      if (!orgId) {
        continue;
      }
      const org = organizationFromJoin(row.organizations);
      options.push({
        organizationId: orgId,
        organizationName: org?.name?.trim() || "Organization",
        campaignRole: row.campaign_role,
        roleLabel: row.organization_roles?.name ?? null,
      });
    }

    return options;
  },
);

/**
 * Active membership for the current request's organization.
 *
 * Isolation: preferred org cookie is applied only when the user has an
 * active membership in that org. Foreign cookie values are ignored.
 */
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
      .order("created_at", { ascending: true });

    if (error?.code === "42P01") {
      return null;
    }

    if (error || !data?.length) {
      return null;
    }

    const rows = data as Array<
      OrganizationUserRow & {
        organization_roles: { name: string } | null;
      }
    >;

    const membershipOrgIds = rows.map((row) => row.organization_id);
    const preferredOrganizationId = await readActiveOrganizationCookie();
    const activeOrgId = resolveActiveOrganizationId({
      preferredOrganizationId,
      membershipOrganizationIds: membershipOrgIds,
    });

    if (!activeOrgId) {
      return null;
    }

    const row =
      rows.find(
        (entry) =>
          normalizeOrganizationId(entry.organization_id) === activeOrgId,
      ) ?? null;

    if (!row) {
      // Defense in depth — should be unreachable if resolve matched a membership.
      return null;
    }

    return {
      organizationId: row.organization_id,
      user: mapOrganizationUserRow(
        row,
        row.organization_roles?.name ?? null,
      ),
    };
  },
);

/**
 * Prove the signed-in user has an active seat in this org.
 * Used before writing the active-org cookie — never trust client org ids.
 */
export async function assertActiveMembershipInOrganization(
  organizationId: string,
): Promise<boolean> {
  const user = await getAuthUser();
  const normalized = normalizeOrganizationId(organizationId);
  if (!user || !normalized) {
    return false;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("organization_users")
    .select("id")
    .eq("user_id", user.id)
    .eq("organization_id", normalized)
    .eq("status", "active")
    .maybeSingle();

  if (error || !data) {
    // Retry with original casing from DB if normalized lookup missed
    // (UUIDs are case-insensitive in Postgres, so this is belt-and-suspenders).
    return false;
  }

  return true;
}

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
  | {
      status: "valid";
      invite: OrganizationUser;
      organizationName: string | null;
    }
  | {
      status: "expired";
      invite: OrganizationUser;
      organizationName: string | null;
    }
  | { status: "missing" };

type InviteLookupRpcRow = OrganizationUserRow & {
  organization_role_name?: string | null;
  organization_name?: string | null;
};

/**
 * Invite token lookup via SECURITY DEFINER RPC (migration 064).
 * Avoids open SELECT on organization_users for anon/public invite pages.
 */
export async function lookupInviteByToken(
  token: string,
): Promise<InviteTokenLookup> {
  const trimmed = token.trim();
  if (!trimmed) {
    return { status: "missing" };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc(
    "lookup_organization_invite_by_token",
    { p_token: trimmed },
  );

  if (error || !data) {
    return { status: "missing" };
  }

  const rows = (Array.isArray(data) ? data : [data]) as InviteLookupRpcRow[];
  const row = rows[0];
  if (!row?.id) {
    return { status: "missing" };
  }

  const invite = mapOrganizationUserRow(
    row,
    row.organization_role_name ?? null,
  );
  const organizationName = row.organization_name?.trim() || null;

  if (isInviteExpired(invite.inviteExpiresAt)) {
    return { status: "expired", invite, organizationName };
  }

  return { status: "valid", invite, organizationName };
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
  const state = await getOrganizationAccessState(supabase, userId);
  if (state === null) {
    return null;
  }
  return state === "active";
}

/**
 * Active vs deactivated vs no membership for post-auth / org-gate routing.
 * Returns null when organization_users is unavailable (legacy local dev).
 */
export async function getOrganizationAccessState(
  supabase: SupabaseClient,
  userId: string,
): Promise<OrganizationAccessState | null> {
  const { data, error } = await supabase
    .from("organization_users")
    .select("status")
    .eq("user_id", userId);

  if (error?.code === "42P01") {
    return null;
  }

  if (error) {
    return "none";
  }

  return resolveOrganizationAccessState(
    (data ?? []).map((row) => row.status as string),
  );
}

export { getLatestOrganizationLegacyId };
