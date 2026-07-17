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
  lookupInviteByToken,
} from "@/lib/auth/membership-queries";
import { replaceOrganizationUserEventAssignments } from "@/lib/auth/event-assignments";
import { getCurrentOrganization } from "@/lib/auth/organization-context";
import { canManageTeam } from "@/lib/auth/infer-campaign-role";
import { getAuthUser, requireAuthUser } from "@/lib/auth/queries";
import { createClient } from "@/lib/supabase/server";
import {
  type CampaignRole,
  campaignRoleLabel,
  isCampaignRole,
} from "@/lib/auth/campaign-roles";
import { getOrganizationAccessTemplates } from "@/lib/access-templates/queries";
import { resolveAccessTemplateSelection } from "@/lib/access-templates/merge";
import { getCurrentCampaignRole, SIMULATED_ROLE_COOKIE } from "@/lib/auth/get-current-role";
import {
  buildInviteLoginUrl,
  resolveAuthSiteOrigin,
  toPublicInviteUrl,
} from "@/lib/auth/invite-url";
import { TEAM_INVITE_TTL_DAYS } from "@/lib/auth/invite-constants";
import {
  clearMustChangePassword,
  createInvitedMemberAccount,
  userMustChangePassword,
} from "@/lib/auth/invite-credentials";
import { provisionTeamMemberAccount } from "@/lib/auth/provision-team-account";
import { buildTeamInviteEmail } from "@/lib/email/team-invite-email";
import {
  isEmailConfigured,
  resolveTeamInviteTemplateId,
  sendEmail,
  sendTemplateEmail,
} from "@/lib/email/send";
import { getOrganizationById } from "@/lib/organizations/queries";
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

function parseEventIdsFromForm(formData: FormData): string[] {
  const multi = formData
    .getAll("eventIds")
    .map((value) => value.toString().trim())
    .filter(Boolean);
  if (multi.length > 0) {
    return Array.from(new Set(multi));
  }
  const csv = formData.get("eventIdsCsv")?.toString() ?? "";
  return Array.from(
    new Set(
      csv
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean),
    ),
  );
}

async function maybeSendTeamInviteEmail(input: {
  sendEmailRequested: boolean;
  toEmail: string;
  inviteUrl: string;
  organizationName: string;
  inviteeName: string | null;
  accessLevel: CampaignRole;
  /** Prefer Access template display name when available. */
  accessLevelLabel?: string | null;
  personalMessage: string | null;
  inviterEmail: string | null;
}): Promise<string | null> {
  if (!input.sendEmailRequested) {
    return null;
  }

  if (!isEmailConfigured()) {
    return "Invite created, but email was not sent (RESEND_API_KEY is not configured). Copy the invite link below.";
  }

  const publicInviteUrl = toPublicInviteUrl(input.inviteUrl);
  const roleLabel =
    input.accessLevelLabel?.trim() || campaignRoleLabel(input.accessLevel);
  const content = buildTeamInviteEmail({
    organizationName: input.organizationName,
    inviteeName: input.inviteeName,
    inviteeEmail: input.toEmail,
    accessLevelLabel: roleLabel,
    inviteUrl: publicInviteUrl,
    personalMessage: input.personalMessage,
    inviterEmail: input.inviterEmail,
    ttlDays: TEAM_INVITE_TTL_DAYS,
  });

  // Prefer branded HTML (secure setup link). Template is best-effort fallback.
  const htmlResult = await sendEmail({
    to: [input.toEmail],
    subject: content.subject,
    html: content.html,
    text: content.text,
  });

  if (htmlResult.success) {
    return null;
  }

  const templateResult = await sendTemplateEmail({
    to: [input.toEmail],
    templateId: resolveTeamInviteTemplateId(),
    subject: content.subject,
    variables: {
      ORGANIZATION_NAME: input.organizationName.trim() || "your PTO",
      INVITEE_NAME: input.inviteeName?.trim() || "there",
      ROLE_LABEL: roleLabel,
      INVITE_URL: publicInviteUrl,
      INVITEE_EMAIL: input.toEmail,
      INVITER_EMAIL: input.inviterEmail?.trim() || "your team",
      PERSONAL_MESSAGE:
        input.personalMessage?.trim() || "Welcome to the team.",
      TEMPORARY_PASSWORD: "Create your own password on the invite page.",
    },
  });

  if (!templateResult.success) {
    return `Invite created, but email failed to send: ${htmlResult.error ?? templateResult.error ?? "unknown error"}. Copy the invite link below.`;
  }

  return null;
}

export interface AuthActionState {
  error: string | null;
  success: boolean;
  message?: string | null;
  warning?: string | null;
  inviteUrl?: string | null;
  provisionedEmail?: string | null;
  provisionedPassword?: string | null;
}

export async function setOrganizationUserEventAssignmentsAction(input: {
  organizationUserId: string;
  eventIds: string[];
}): Promise<AuthActionState> {
  const organization = await getCurrentOrganization();
  const campaignRole = await getCurrentCampaignRole();

  if (!organization) {
    return { error: "Sign in and set up your organization first.", success: false };
  }
  if (!canManageTeam(campaignRole)) {
    return { error: "You do not have permission to update event assignments.", success: false };
  }

  const result = await replaceOrganizationUserEventAssignments({
    organizationId: organization.id,
    organizationUserId: input.organizationUserId,
    eventIds: input.eventIds,
  });

  if ("error" in result) {
    return { error: result.error, success: false };
  }

  revalidatePath("/settings/team-access");
  return {
    error: null,
    success: true,
    message: "Event assignments updated.",
  };
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
  const inviteToken = formData.get("inviteToken")?.toString()?.trim() || null;

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
    const claim = await acceptPendingInvitesForUser(
      data.user.id,
      data.user.email,
      { inviteToken },
    );
    if (claim.emailMismatch) {
      return {
        error: `This invite is for ${claim.emailMismatch}. Sign in with that email.`,
        success: false,
      };
    }
  }

  await clearPendingFoundingAccessCookie();

  if (data.user && userMustChangePassword(data.user)) {
    redirect("/account/change-password");
  }

  redirect(await getAuthenticatedAppPath(safeNextPath(formData.get("next")?.toString())));
}

export async function completeInviteSetupAction(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const inviteToken = formData.get("inviteToken")?.toString()?.trim() || "";
  const password = formData.get("password")?.toString() ?? "";
  const confirmPassword = formData.get("confirmPassword")?.toString() ?? "";

  if (!inviteToken) {
    return { error: "This invite link is invalid.", success: false };
  }

  const lookup = await lookupInviteByToken(inviteToken);
  if (lookup.status === "missing") {
    return {
      error: "This invite link is invalid or already used.",
      success: false,
    };
  }
  if (lookup.status === "expired") {
    return {
      error:
        "This invite has expired. Ask your admin to resend the invitation.",
      success: false,
    };
  }

  if (password.length < 8) {
    return { error: "Password must be at least 8 characters.", success: false };
  }
  if (password !== confirmPassword) {
    return { error: "Passwords do not match.", success: false };
  }

  const created = await createInvitedMemberAccount({
    email: lookup.invite.email,
    password,
  });
  if ("error" in created) {
    return { error: created.error, success: false };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: lookup.invite.email,
    password,
  });
  if (error || !data.user?.email) {
    return {
      error:
        error?.message ??
        "Account created, but sign-in failed. Try signing in from the login page.",
      success: false,
    };
  }

  const claim = await acceptPendingInvitesForUser(
    data.user.id,
    data.user.email,
    { inviteToken },
  );
  if (claim.accepted < 1) {
    return {
      error:
        claim.emailMismatch
          ? `This invite is for ${claim.emailMismatch}.`
          : "Could not activate your team access. Ask your admin to resend the invite.",
      success: false,
    };
  }

  await clearPendingFoundingAccessCookie();
  redirect(await getAuthenticatedAppPath());
}

export async function changePasswordAction(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const user = await getAuthUser();
  if (!user) {
    return { error: "Sign in first.", success: false };
  }

  const password = formData.get("password")?.toString() ?? "";
  const confirmPassword = formData.get("confirmPassword")?.toString() ?? "";

  if (password.length < 8) {
    return { error: "Password must be at least 8 characters.", success: false };
  }
  if (password !== confirmPassword) {
    return { error: "Passwords do not match.", success: false };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    return { error: error.message, success: false };
  }

  await clearMustChangePassword(user.id);
  redirect(await getAuthenticatedAppPath());
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
      : inviteToken
        ? "Check your email for a sign-in link. Open it to join the team — use the same invited address."
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
  await acceptPendingInvitesForUser(user.id, user.email ?? "");
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
  const displayName = formData.get("fullName")?.toString()?.trim() || null;
  const organizationRoleId = formData.get("organizationRoleId")?.toString() || null;
  const committeeId = formData.get("committeeId")?.toString() || null;
  const inviteMessage = formData.get("message")?.toString()?.trim() || null;
  const accessRoleRaw = formData.get("campaignRole")?.toString() ?? "";
  const sendEmailRequested =
    formData.get("sendEmail")?.toString() === "true" ||
    formData.get("sendEmail")?.toString() === "on";
  const eventIds = parseEventIdsFromForm(formData);

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

  const accessTemplates = await getOrganizationAccessTemplates(organization.id);
  const templateSelection = resolveAccessTemplateSelection(
    accessTemplates,
    accessRoleRaw,
  );
  const resolvedCampaignRole =
    templateSelection?.campaignRole ??
    resolveCampaignRoleForInvite(accessRoleRaw, roleKind);
  const accessTemplateId =
    templateSelection?.templateId ?? resolvedCampaignRole;

  const result = await inviteOrganizationUser({
    organizationId: organization.id,
    email,
    displayName,
    organizationRoleId,
    committeeId,
    inviteMessage,
    campaignRole: resolvedCampaignRole,
    accessTemplateId,
    invitedByUserId: user.id,
  });

  if ("error" in result) {
    return { error: result.error, success: false };
  }

  const assignmentResult = await replaceOrganizationUserEventAssignments({
    organizationId: organization.id,
    organizationUserId: result.id,
    eventIds,
  });
  const assignmentWarning =
    "error" in assignmentResult
      ? `Event assignment failed: ${assignmentResult.error}`
      : null;

  const headersList = await headers();
  const inviteUrl = buildInviteLoginUrl(
    result.inviteToken,
    resolveAuthSiteOrigin(
      headersList.get("origin"),
      headersList.get("x-forwarded-host") ?? headersList.get("host"),
      headersList.get("x-forwarded-proto"),
    ),
  );

  const orgRecord = await getOrganizationById(organization.id);
  const accessLevelLabel =
    accessTemplates.find((template) => template.id === accessTemplateId)
      ?.displayName ?? campaignRoleLabel(resolvedCampaignRole);
  const emailWarning = await maybeSendTeamInviteEmail({
    sendEmailRequested,
    toEmail: email,
    inviteUrl,
    organizationName: orgRecord?.name ?? "your PTO",
    inviteeName: displayName,
    accessLevel: resolvedCampaignRole,
    accessLevelLabel,
    personalMessage: inviteMessage,
    inviterEmail: user.email ?? null,
  });

  const warning = [assignmentWarning, emailWarning].filter(Boolean).join(" ") || null;

  revalidatePath("/settings/team-access");
  return {
    error: null,
    success: true,
    inviteUrl,
    warning,
    message: warning
      ? `Added ${email} to your team.`
      : sendEmailRequested
        ? `Invite email sent to ${email}. You can also copy the link below.`
        : `Added ${email} to your team. Share the invite link below.`,
  };
}

export async function updateTeamMemberAction(
  membershipId: string,
  input: {
    organizationRoleId?: string | null;
    campaignRole?: CampaignRole | string;
    accessTemplateId?: string | null;
    status?: "active" | "deactivated";
    displayName?: string | null;
    committeeId?: string | null;
  },
): Promise<AuthActionState> {
  const campaignRole = await getCurrentCampaignRole();
  if (!canManageTeam(campaignRole)) {
    return { error: "You do not have permission to update team members.", success: false };
  }

  const organization = await getCurrentOrganization();
  const resolvedInput: {
    organizationRoleId?: string | null;
    campaignRole?: CampaignRole;
    accessTemplateId?: string | null;
    status?: "active" | "deactivated";
    displayName?: string | null;
    committeeId?: string | null;
  } = {
    organizationRoleId: input.organizationRoleId,
    accessTemplateId: input.accessTemplateId,
    status: input.status,
    displayName: input.displayName,
    committeeId: input.committeeId,
  };

  if (typeof input.campaignRole === "string" && organization) {
    const templates = await getOrganizationAccessTemplates(organization.id);
    const selection = resolveAccessTemplateSelection(
      templates,
      input.campaignRole,
    );
    if (selection) {
      resolvedInput.campaignRole = selection.campaignRole;
      resolvedInput.accessTemplateId =
        input.accessTemplateId ?? selection.templateId;
    } else if (isCampaignRole(input.campaignRole)) {
      resolvedInput.campaignRole = input.campaignRole;
      resolvedInput.accessTemplateId =
        input.accessTemplateId ?? input.campaignRole;
    } else {
      return { error: "Invalid access role.", success: false };
    }
  }

  const result = await updateOrganizationMembership(membershipId, resolvedInput);
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

  if (existing) {
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

  return {
    error:
      "This person does not have app access yet. Use Give App Access to create an invite.",
    success: false,
  };
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
  options?: { sendEmail?: boolean },
): Promise<AuthActionState> {
  const user = await getAuthUser();
  const organization = await getCurrentOrganization();
  const campaignRole = await getCurrentCampaignRole();
  if (!canManageTeam(campaignRole)) {
    return { error: "You do not have permission to resend invites.", success: false };
  }

  const result = await refreshOrganizationInviteToken(membershipId);
  if ("error" in result) {
    return { error: result.error, success: false };
  }

  const supabase = await createClient();
  const { data: membership } = await supabase
    .from("organization_users")
    .select(
      "email, display_name, campaign_role, access_template_id, invite_message",
    )
    .eq("id", membershipId)
    .maybeSingle();

  const headersList = await headers();
  const inviteUrl = buildInviteLoginUrl(
    result.inviteToken,
    resolveAuthSiteOrigin(
      headersList.get("origin"),
      headersList.get("x-forwarded-host") ?? headersList.get("host"),
      headersList.get("x-forwarded-proto"),
    ),
  );

  let emailWarning: string | null = null;
  if (options?.sendEmail !== false && membership?.email && organization) {
    const orgRecord = await getOrganizationById(organization.id);
    const accessLevel = isCampaignRole(membership.campaign_role as string)
      ? (membership.campaign_role as CampaignRole)
      : "contributor";
    const templates = await getOrganizationAccessTemplates(organization.id);
    const templateId =
      (membership.access_template_id as string | null) ?? accessLevel;
    const accessLevelLabel =
      templates.find((template) => template.id === templateId)?.displayName ??
      campaignRoleLabel(accessLevel);
    emailWarning = await maybeSendTeamInviteEmail({
      sendEmailRequested: true,
      toEmail: membership.email as string,
      inviteUrl,
      organizationName: orgRecord?.name ?? "your PTO",
      inviteeName: (membership.display_name as string | null) ?? null,
      accessLevel,
      accessLevelLabel,
      personalMessage: (membership.invite_message as string | null) ?? null,
      inviterEmail: user?.email ?? null,
    });
  }

  revalidatePath("/settings/team-access");
  return {
    error: null,
    success: true,
    inviteUrl,
    warning: emailWarning,
    message: emailWarning
      ? "Invite link refreshed."
      : "Invite link refreshed. Share the new link below.",
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

/**
 * Grant app login access to an existing roster person (organization_members row).
 * Does not re-collect committee/event assignments — those stay on the roster record.
 */
export async function giveAppAccessAction(input: {
  organizationMemberId: string;
  email: string;
  campaignRole: CampaignRole | string;
  sendEmail?: boolean;
}): Promise<AuthActionState> {
  const user = await getAuthUser();
  const organization = await getCurrentOrganization();
  const currentRole = await getCurrentCampaignRole();

  if (!user || !organization) {
    return { error: "Sign in and set up your organization first.", success: false };
  }

  if (!canManageTeam(currentRole)) {
    return { error: "You do not have permission to grant app access.", success: false };
  }

  const organizationMemberId = input.organizationMemberId.trim();
  const email = input.email.trim();
  if (!organizationMemberId) {
    return { error: "Roster person is required.", success: false };
  }
  if (!email) {
    return { error: "Email is required to grant app access.", success: false };
  }

  const templates = await getOrganizationAccessTemplates(organization.id);
  const selection = resolveAccessTemplateSelection(
    templates,
    String(input.campaignRole),
  );
  if (!selection) {
    return { error: "Invalid access role.", success: false };
  }
  const resolvedCampaignRole: CampaignRole = selection.campaignRole;
  const accessTemplateId = selection.templateId;

  const supabase = await createClient();
  const { data: rosterMember, error: rosterError } = await supabase
    .from("organization_members")
    .select("id, name, email, organization_role_id")
    .eq("id", organizationMemberId)
    .eq("organization_id", organization.id)
    .maybeSingle();

  if (rosterError || !rosterMember) {
    return { error: "Roster person not found.", success: false };
  }

  const result = await inviteOrganizationUser({
    organizationId: organization.id,
    email,
    displayName: (rosterMember.name as string | null) ?? null,
    organizationRoleId:
      (rosterMember.organization_role_id as string | null) ?? null,
    organizationMemberId,
    campaignRole: resolvedCampaignRole,
    accessTemplateId,
    invitedByUserId: user.id,
  });

  if ("error" in result) {
    return { error: result.error, success: false };
  }

  // Sync roster event assignments onto the new login membership when present.
  const { listOrganizationMemberEventIds } = await import(
    "@/lib/organization-workspace/roster-assignments"
  );
  const rosterEventIds = await listOrganizationMemberEventIds(organizationMemberId);
  if (rosterEventIds.length > 0) {
    await replaceOrganizationUserEventAssignments({
      organizationId: organization.id,
      organizationUserId: result.id,
      eventIds: rosterEventIds,
      syncLinkedMember: false,
    });
  }

  if (rosterMember.email !== email) {
    await updateOrganizationMember(organizationMemberId, { email });
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

  const orgRecord = await getOrganizationById(organization.id);
  const accessLevelLabel =
    templates.find((template) => template.id === accessTemplateId)
      ?.displayName ?? campaignRoleLabel(resolvedCampaignRole);
  const emailWarning = await maybeSendTeamInviteEmail({
    sendEmailRequested: input.sendEmail !== false,
    toEmail: email,
    inviteUrl,
    organizationName: orgRecord?.name ?? "your PTO",
    inviteeName: (rosterMember.name as string | null) ?? null,
    accessLevel: resolvedCampaignRole,
    accessLevelLabel,
    personalMessage: null,
    inviterEmail: user.email ?? null,
  });

  revalidatePath("/settings/team-access");
  return {
    error: null,
    success: true,
    inviteUrl,
    warning: emailWarning,
    message: emailWarning
      ? `Granted app access to ${email}.`
      : input.sendEmail !== false
        ? `Invite email sent to ${email}. You can also copy the link below.`
        : `Granted app access to ${email}. Share the invite link below.`,
  };
}

export async function replaceMemberEventAssignmentsAction(input: {
  organizationMemberId: string;
  eventIds: string[];
}): Promise<AuthActionState> {
  const organization = await getCurrentOrganization();
  const campaignRole = await getCurrentCampaignRole();

  if (!organization) {
    return { error: "Sign in and set up your organization first.", success: false };
  }
  if (!canManageTeam(campaignRole)) {
    return { error: "You do not have permission to update event assignments.", success: false };
  }
  if (!input.organizationMemberId.trim()) {
    return { error: "Roster person is required.", success: false };
  }

  const { replaceOrganizationMemberEventAssignments } = await import(
    "@/lib/organization-workspace/roster-assignments"
  );
  const result = await replaceOrganizationMemberEventAssignments({
    organizationId: organization.id,
    organizationMemberId: input.organizationMemberId,
    eventIds: input.eventIds,
  });

  if ("error" in result) {
    return { error: result.error, success: false };
  }

  revalidatePath("/settings/team-access");
  return {
    error: null,
    success: true,
    message: "Event assignments updated.",
  };
}
