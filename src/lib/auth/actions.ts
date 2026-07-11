"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cookies, headers } from "next/headers";
import {
  cancelOrganizationInvite,
  deleteOrganizationMembership,
  inviteOrganizationUser,
  refreshOrganizationInviteToken,
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
import {
  buildInviteLoginUrl,
  resolveAuthSiteOrigin,
} from "@/lib/auth/invite-url";
import { provisionTeamMemberAccount } from "@/lib/auth/provision-team-account";
import type { MemberEditSource } from "@/components/settings-v2/team-access/member-edit-utils";
import {
  updateOrganizationCommittee,
} from "@/lib/organization-workspace/committee-mutations";
import {
  updateOrganizationMember,
  updateOrganizationRole,
} from "@/lib/organization-workspace/mutations";
import {
  clearPendingFoundingAccessCookie,
  isFoundingAccessCodeRequired,
  PENDING_FOUNDING_ACCESS_QUERY_PARAM,
  resolveFoundingAccess,
  setPendingFoundingAccessCookie,
} from "@/lib/auth/founding-access";
import { createPendingFoundingAccessLinkToken } from "@/lib/auth/founding-access-link-token";
import { isOAuthSignInProvider } from "@/lib/auth/oauth-providers";
import {
  getAuthenticatedAppPath,
  SCHOOL_SETUP_PATH,
} from "@/lib/auth/post-auth-path";
import { safeNextPath } from "@/lib/auth/safe-next-path";
import { isSupabaseAdminConfigured } from "@/lib/supabase/admin";

export interface AuthActionState {
  error: string | null;
  success: boolean;
  message?: string | null;
  inviteUrl?: string | null;
  provisionedEmail?: string | null;
  provisionedPassword?: string | null;
}

export async function getOAuthSignInUrl(
  provider: string,
  inviteToken?: string | null,
  nextPath?: string | null,
): Promise<{ url: string } | { error: string }> {
  if (!isOAuthSignInProvider(provider)) {
    return { error: "Unsupported sign-in provider." };
  }

  const supabase = await createClient();
  const headersList = await headers();
  const origin = resolveAuthSiteOrigin(
    headersList.get("origin"),
    headersList.get("x-forwarded-host") ?? headersList.get("host"),
    headersList.get("x-forwarded-proto"),
  );
  const redirectTo = new URL("/auth/callback", origin);

  if (inviteToken) {
    redirectTo.searchParams.set("invite", inviteToken);
  }

  const safeNext = safeNextPath(nextPath);
  if (safeNext) {
    redirectTo.searchParams.set("next", safeNext);
  }

  const options: {
    redirectTo: string;
    skipBrowserRedirect: true;
    queryParams?: Record<string, string>;
  } = {
    redirectTo: redirectTo.toString(),
    skipBrowserRedirect: true,
  };

  if (provider === "google") {
    options.queryParams = {
      access_type: "offline",
      prompt: "consent",
    };
  }

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options,
  });

  if (error) {
    const message = error.message.includes("redirect")
      ? `${error.message} Add ${redirectTo.origin}/auth/callback to Supabase Auth redirect URLs.`
      : error.message;
    return { error: message };
  }

  if (!data.url) {
    return {
      error:
        "Could not start social sign-in. Enable the provider in Supabase Auth settings.",
    };
  }

  return { url: data.url };
}

export async function signInWithPasswordAction(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const email = formData.get("email")?.toString()?.trim() ?? "";
  const password = formData.get("password")?.toString() ?? "";

  if (!email || !password) {
    return { error: "Enter your email and password.", success: false };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: error.message, success: false };
  }

  if (data.user?.email) {
    await acceptPendingInvitesForUser(data.user.id, data.user.email);
  }

  await clearPendingFoundingAccessCookie();

  redirect(await getAuthenticatedAppPath(safeNextPath(formData.get("next")?.toString())));
}

export async function signInWithEmailAction(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const email = formData.get("email")?.toString()?.trim() ?? "";
  const accessCode = formData.get("accessCode")?.toString()?.trim() || null;
  const inviteToken = formData.get("inviteToken")?.toString()?.trim() || null;
  const setupIntent = formData.get("setupIntent")?.toString() === "true";
  const next = safeNextPath(formData.get("next")?.toString());

  if (!email) {
    return { error: "Enter your email address.", success: false };
  }

  const isNewSchoolSignup = setupIntent && !inviteToken;
  let normalizedFoundingCode: string | null = null;

  if (isNewSchoolSignup) {
    const foundingAccess = resolveFoundingAccess(accessCode, {
      required: isFoundingAccessCodeRequired(),
    });
    if (!foundingAccess.valid) {
      return { error: foundingAccess.error, success: false };
    }

    normalizedFoundingCode = foundingAccess.normalizedCode;
    if (normalizedFoundingCode) {
      await setPendingFoundingAccessCookie(normalizedFoundingCode);
    }
  }

  const supabase = await createClient();
  const headersList = await headers();
  const origin = resolveAuthSiteOrigin(
    headersList.get("origin"),
    headersList.get("x-forwarded-host") ?? headersList.get("host"),
    headersList.get("x-forwarded-proto"),
  );
  const redirectTo = new URL("/auth/callback", origin);
  if (inviteToken) {
    redirectTo.searchParams.set("invite", inviteToken);
  }
  if (next) {
    redirectTo.searchParams.set("next", next);
  }
  if (isNewSchoolSignup) {
    redirectTo.searchParams.set("setup", "1");
    if (normalizedFoundingCode) {
      redirectTo.searchParams.set(
        PENDING_FOUNDING_ACCESS_QUERY_PARAM,
        createPendingFoundingAccessLinkToken(email, normalizedFoundingCode),
      );
    }
  }

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: redirectTo.toString(),
      shouldCreateUser: Boolean(inviteToken) || isNewSchoolSignup,
    },
  });

  if (error) {
    const message = error.message.includes("redirect")
      ? `${error.message} Add ${redirectTo.origin}/auth/callback to Supabase Auth redirect URLs.`
      : error.message;
    return { error: message, success: false };
  }

  return {
    error: null,
    success: true,
    message: isNewSchoolSignup
      ? "Check your email for a link to create your account and continue to school setup."
      : "Check your email for a sign-in link. If nothing arrives in a few minutes, check spam or ask your admin to configure Supabase email delivery.",
  };
}

export async function signOutAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function submitFoundingAccessCodeAction(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const user = await getAuthUser();
  if (!user) {
    return { error: "Sign in first, then enter your founding access code.", success: false };
  }

  const accessCode = formData.get("accessCode")?.toString()?.trim() || null;
  const foundingAccess = resolveFoundingAccess(accessCode, {
    required: isFoundingAccessCodeRequired(),
  });

  if (!foundingAccess.valid) {
    return { error: foundingAccess.error, success: false };
  }

  if (foundingAccess.normalizedCode) {
    await setPendingFoundingAccessCookie(foundingAccess.normalizedCode);
  }

  redirect(SCHOOL_SETUP_PATH);
}

export async function completeAuthSessionAction(): Promise<void> {
  const user = await requireAuthUser();
  await acceptPendingInvitesForUser(user.id, user.email);
}

export async function createTeamMemberAccountAction(
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
    return { error: "You do not have permission to create team accounts.", success: false };
  }

  if (!isSupabaseAdminConfigured()) {
    return {
      error:
        "Add SUPABASE_SERVICE_ROLE_KEY to .env.local to create tester accounts from the app.",
      success: false,
    };
  }

  const email = formData.get("email")?.toString()?.trim() ?? "";
  const password = formData.get("password")?.toString() ?? "";
  const organizationRoleId = formData.get("organizationRoleId")?.toString() || null;
  const accessRoleRaw = formData.get("campaignRole")?.toString() ?? "";

  if (!email) {
    return { error: "Email is required.", success: false };
  }

  if (!password) {
    return { error: "Choose a temporary password for this person.", success: false };
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

  const result = await provisionTeamMemberAccount({
    organizationId: organization.id,
    email,
    password,
    organizationRoleId,
    campaignRole: resolveCampaignRoleForInvite(accessRoleRaw, roleKind),
  });

  if ("error" in result) {
    return { error: result.error, success: false };
  }

  revalidatePath("/settings/team-access");
  return {
    error: null,
    success: true,
    provisionedEmail: email,
    provisionedPassword: password,
    message: `Account ready for ${email}. Share the sign-in details below — no email required.`,
  };
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

  const headersList = await headers();
  const inviteUrl = buildInviteLoginUrl(
    result.inviteToken,
    resolveAuthSiteOrigin(
      headersList.get("origin"),
      headersList.get("x-forwarded-host") ?? headersList.get("host"),
      headersList.get("x-forwarded-proto"),
    ),
  );

  revalidatePath("/settings/team-access");
  return {
    error: null,
    success: true,
    inviteUrl,
    message: `Added ${email} to your team. Share the invite link below — Hey Ralli does not email invites automatically yet.`,
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

  revalidatePath("/settings/team-access");
  return { error: null, success: true };
}

export async function setTeamMemberAccessLevelAction(input: {
  membershipId?: string;
  email: string;
  organizationRoleId?: string | null;
  campaignRole: CampaignRole;
}): Promise<AuthActionState> {
  const user = await getAuthUser();
  const organization = await getCurrentOrganization();
  const currentRole = await getCurrentCampaignRole();

  if (!user || !organization) {
    return { error: "Sign in and set up your organization first.", success: false };
  }

  if (!canManageTeam(currentRole)) {
    return { error: "You do not have permission to update team members.", success: false };
  }

  if (!isCampaignRole(input.campaignRole)) {
    return { error: "Invalid access role.", success: false };
  }

  const email = input.email.trim();
  if (!email) {
    return { error: "Email is required to set access level.", success: false };
  }

  if (input.membershipId) {
    const result = await updateOrganizationMembership(input.membershipId, {
      campaignRole: input.campaignRole,
      organizationRoleId: input.organizationRoleId,
    });
    if ("error" in result) {
      return { error: result.error, success: false };
    }

    revalidatePath("/settings/team-access");
    return { error: null, success: true };
  }

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("organization_users")
    .select("id, status")
    .eq("organization_id", organization.id)
    .ilike("email", email)
    .maybeSingle();

  if (existing?.status === "active") {
    const result = await updateOrganizationMembership(existing.id, {
      campaignRole: input.campaignRole,
      organizationRoleId: input.organizationRoleId,
    });
    if ("error" in result) {
      return { error: result.error, success: false };
    }

    revalidatePath("/settings/team-access");
    return { error: null, success: true };
  }

  const result = await inviteOrganizationUser({
    organizationId: organization.id,
    email,
    organizationRoleId: input.organizationRoleId ?? null,
    campaignRole: input.campaignRole,
    invitedByUserId: user.id,
  });

  if ("error" in result) {
    return { error: result.error, success: false };
  }

  revalidatePath("/settings/team-access");
  return { error: null, success: true };
}

export async function setRosterMemberAccessLevelAction(input: {
  source: MemberEditSource;
  campaignRole: CampaignRole;
}): Promise<AuthActionState> {
  const currentRole = await getCurrentCampaignRole();

  if (!canManageTeam(currentRole)) {
    return { error: "You do not have permission to update team members.", success: false };
  }

  if (!isCampaignRole(input.campaignRole)) {
    return { error: "Invalid access role.", success: false };
  }

  const { source } = input;

  if (source.kind === "org_user") {
    const result = await updateOrganizationMembership(source.membershipId, {
      campaignRole: input.campaignRole,
    });
    if ("error" in result) {
      return { error: result.error, success: false };
    }
    revalidatePath("/settings/team-access");
    return { error: null, success: true };
  }

  if (source.kind === "org_role") {
    const result = await updateOrganizationRole(source.roleId, {
      campaignRole: input.campaignRole,
    });
    if ("error" in result) {
      return { error: result.error, success: false };
    }
  } else if (source.kind === "org_member") {
    if (!source.memberId) {
      return { error: "Member record not found.", success: false };
    }
    const result = await updateOrganizationMember(source.memberId, {
      campaignRole: input.campaignRole,
    });
    if ("error" in result) {
      return { error: result.error, success: false };
    }
  } else if (source.kind === "committee") {
    const result = await updateOrganizationCommittee(source.committeeId, {
      campaignRole: input.campaignRole,
    });
    if ("error" in result) {
      return { error: result.error, success: false };
    }
  } else {
    return { error: "Unable to update access level for this member.", success: false };
  }

  revalidatePath("/settings/team-access");
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

  revalidatePath("/settings/team-access");
  return { error: null, success: true };
}

export async function resendTeamInviteAction(
  membershipId: string,
): Promise<AuthActionState> {
  const campaignRole = await getCurrentCampaignRole();
  if (!canManageTeam(campaignRole)) {
    return { error: "You do not have permission to resend invites.", success: false };
  }

  const result = await refreshOrganizationInviteToken(membershipId);
  if ("error" in result) {
    return { error: result.error, success: false };
  }

  const headersList = await headers();
  const inviteUrl = buildInviteLoginUrl(
    result.inviteToken,
    resolveAuthSiteOrigin(
      headersList.get("origin"),
      headersList.get("x-forwarded-host") ?? headersList.get("host"),
      headersList.get("x-forwarded-proto"),
    ),
  );

  revalidatePath("/settings/team-access");
  return {
    error: null,
    success: true,
    inviteUrl,
    message: "Invite link refreshed. Share the new link below.",
  };
}

export async function cancelTeamInviteAction(
  membershipId: string,
): Promise<AuthActionState> {
  const campaignRole = await getCurrentCampaignRole();
  if (!canManageTeam(campaignRole)) {
    return { error: "You do not have permission to cancel invites.", success: false };
  }

  const result = await cancelOrganizationInvite(membershipId);
  if ("error" in result) {
    return { error: result.error, success: false };
  }

  revalidatePath("/settings/team-access");
  return { error: null, success: true, message: "Invite cancelled." };
}

export async function claimOrganizationAccessAction(): Promise<AuthActionState> {
  await requireAuthUser();
  const organization = await getCurrentOrganization();

  if (organization) {
    return { error: "You already belong to an organization.", success: false };
  }

  return {
    error:
      "Complete School Setup to create your PTO workspace. Claiming an existing organization is disabled.",
    success: false,
  };
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
