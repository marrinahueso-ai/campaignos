"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cookies, headers } from "next/headers";
import {
  claimOrganizationAdminAccess,
  deleteOrganizationMembership,
  inviteOrganizationUser,
  resolveCampaignRoleForInvite,
  updateOrganizationMembership,
} from "@/lib/auth/membership-mutations";
import {
  acceptPendingInvitesForUser,
} from "@/lib/auth/membership-queries";
import { getCurrentOrganization } from "@/lib/auth/organization-context";
import { canManageTeam } from "@/lib/auth/infer-campaign-role";
import { getAuthUser, requireAuthUser } from "@/lib/auth/queries";
import { createClient } from "@/lib/supabase/server";
import {
  type CampaignRole,
  isCampaignRole,
} from "@/lib/auth/campaign-roles";
import { getCurrentCampaignRole, SIMULATED_ROLE_COOKIE } from "@/lib/auth/get-current-role";

export interface AuthActionState {
  error: string | null;
  success: boolean;
  message?: string | null;
}

export async function signInWithEmailAction(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const email = formData.get("email")?.toString()?.trim() ?? "";
  const inviteToken = formData.get("inviteToken")?.toString()?.trim() || null;

  if (!email) {
    return { error: "Enter your email address.", success: false };
  }

  const supabase = await createClient();
  const headersList = await headers();
  const origin =
    headersList.get("origin") ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    "http://localhost:3000";
  const redirectTo = new URL("/auth/callback", origin);
  if (inviteToken) {
    redirectTo.searchParams.set("invite", inviteToken);
  }

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: redirectTo.toString(),
      shouldCreateUser: true,
    },
  });

  if (error) {
    return { error: error.message, success: false };
  }

  return {
    error: null,
    success: true,
    message: "Check your email for a sign-in link.",
  };
}

export async function signOutAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function completeAuthSessionAction(): Promise<void> {
  const user = await requireAuthUser();
  await acceptPendingInvitesForUser(user.id, user.email);
}

export async function inviteTeamMemberAction(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const user = await getAuthUser();
  const organization = await getCurrentOrganization();
  const campaignRole = await getCurrentCampaignRole();

  if (!user || !organization) {
    return { error: "Sign in and set up your organization first.", success: false };
  }

  if (!canManageTeam(campaignRole)) {
    return { error: "You do not have permission to invite team members.", success: false };
  }

  const email = formData.get("email")?.toString()?.trim() ?? "";
  const organizationRoleId = formData.get("organizationRoleId")?.toString() || null;
  const accessRoleRaw = formData.get("campaignRole")?.toString() ?? "";

  if (!email) {
    return { error: "Email is required.", success: false };
  }

  let roleKind = null as import("@/types/organization-workspace").OrganizationRoleKind | null;
  if (organizationRoleId) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("organization_roles")
      .select("role_kind")
      .eq("id", organizationRoleId)
      .maybeSingle();
    roleKind = (data?.role_kind as typeof roleKind) ?? null;
  }

  const result = await inviteOrganizationUser({
    organizationId: organization.id,
    email,
    organizationRoleId,
    campaignRole: resolveCampaignRoleForInvite(accessRoleRaw, roleKind),
    invitedByUserId: user.id,
  });

  if ("error" in result) {
    return { error: result.error, success: false };
  }

  revalidatePath("/settings/team");
  return {
    error: null,
    success: true,
    message: `Invite sent to ${email}. They can sign in with that email to join.`,
  };
}

export async function updateTeamMemberAction(
  membershipId: string,
  input: {
    organizationRoleId?: string | null;
    campaignRole?: CampaignRole;
    status?: "active" | "deactivated";
  },
): Promise<AuthActionState> {
  const campaignRole = await getCurrentCampaignRole();
  if (!canManageTeam(campaignRole)) {
    return { error: "You do not have permission to update team members.", success: false };
  }

  const result = await updateOrganizationMembership(membershipId, input);
  if ("error" in result) {
    return { error: result.error, success: false };
  }

  revalidatePath("/settings/team");
  return { error: null, success: true };
}

export async function removeTeamMemberAction(
  membershipId: string,
): Promise<AuthActionState> {
  const campaignRole = await getCurrentCampaignRole();
  if (!canManageTeam(campaignRole)) {
    return { error: "You do not have permission to remove team members.", success: false };
  }

  const result = await deleteOrganizationMembership(membershipId);
  if ("error" in result) {
    return { error: result.error, success: false };
  }

  revalidatePath("/settings/team");
  return { error: null, success: true };
}

export async function claimOrganizationAccessAction(): Promise<AuthActionState> {
  const user = await requireAuthUser();
  const organization = await getCurrentOrganization();

  if (!organization) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("organizations")
      .select("id")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!data?.id) {
      return { error: "No organization found to claim.", success: false };
    }

    const result = await claimOrganizationAdminAccess({
      organizationId: data.id,
      userId: user.id,
      email: user.email,
    });

    if ("error" in result) {
      return { error: result.error, success: false };
    }

    revalidatePath("/settings/team");
    revalidatePath("/dashboard");
    return { error: null, success: true, message: "You are now the admin for this PTO." };
  }

  return { error: "You already belong to an organization.", success: false };
}

export async function setSimulatedRoleAction(
  role: CampaignRole,
  eventPath?: string,
): Promise<{ success: boolean }> {
  if (!isCampaignRole(role)) {
    return { success: false };
  }

  const cookieStore = await cookies();
  cookieStore.set(SIMULATED_ROLE_COOKIE, role, {
    path: "/",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
  });

  if (eventPath) {
    revalidatePath(eventPath);
  }

  return { success: true };
}
