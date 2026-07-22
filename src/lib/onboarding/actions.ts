"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  clearPendingFoundingAccessCookie,
  getPendingFoundingAccessCode,
  isFoundingAccessCodeRequired,
  resolveFoundingAccess,
} from "@/lib/auth/founding-access";
import { getActiveMembership } from "@/lib/auth/membership-queries";
import { getOrganizationUsers } from "@/lib/auth/membership-queries";
import { inviteTeamMemberAction } from "@/lib/auth/actions";
import { getCurrentOrganization } from "@/lib/auth/organization-context";
import {
  getOrganizationOnboardingState,
  patchOrganizationOnboardingState,
} from "@/lib/onboarding/mutations";
import {
  buildOnboardingChecklist,
  hasCompletedFirstEvent,
  nextOnboardingPrompt,
  parseOnboardingState,
} from "@/lib/onboarding/state";
import type { OnboardingChecklistItem } from "@/lib/onboarding/types";
import {
  bootstrapMinimalOrganization,
  updateOrganizationBrand,
} from "@/lib/organizations/mutations";
import { getSchoolProfile } from "@/lib/organizations/queries";
import { getSchoolYearSettingsData } from "@/lib/school-years/actions";
import { getOrganizationWorkspaceData } from "@/lib/organization-workspace/queries";

function revalidateOnboardingPaths() {
  revalidatePath("/dashboard");
  revalidatePath("/onboarding");
  revalidatePath("/settings/school-setup");
  revalidatePath("/events");
}

export async function startValueFirstOnboardingAction(formData: FormData) {
  const membership = await getActiveMembership();
  if (membership) {
    const state = await getOrganizationOnboardingState(
      membership.organizationId,
    );
    if (!hasCompletedFirstEvent(state)) {
      redirect("/events/create?onboarding=1");
    }
    redirect("/dashboard");
  }

  const timezone =
    formData.get("timezone")?.toString().trim() || "America/Chicago";
  const schoolName = formData.get("schoolName")?.toString().trim() || undefined;

  const pendingCode = await getPendingFoundingAccessCode();
  if (isFoundingAccessCodeRequired() && !pendingCode) {
    redirect("/login?intent=setup&error=code_required");
  }

  const foundingAccess = pendingCode
    ? resolveFoundingAccess(pendingCode, { required: true })
    : resolveFoundingAccess(null, { required: false });

  if (pendingCode && !foundingAccess.valid) {
    redirect("/login?intent=setup&error=code_required");
  }

  const result = await bootstrapMinimalOrganization({
    name: schoolName,
    timezone,
    foundingAccess: foundingAccess.valid
      ? foundingAccess
      : {
          valid: true,
          billingExempt: false,
          normalizedCode: null,
          error: null,
        },
  });

  if ("error" in result) {
    redirect(`/onboarding?error=${encodeURIComponent(result.error)}`);
  }

  if (pendingCode && foundingAccess.valid) {
    await clearPendingFoundingAccessCookie();
  }

  revalidateOnboardingPaths();
  redirect("/events/create?onboarding=1");
}

export async function skipOnboardingPromptAction(
  step: "calendar" | "brand" | "invite",
) {
  const organization = await getCurrentOrganization();
  if (!organization) {
    return { error: "Workspace not found." };
  }

  const now = new Date().toISOString();
  const patch =
    step === "calendar"
      ? { calendarSkippedAt: now }
      : step === "brand"
        ? { brandSkippedAt: now }
        : { inviteSkippedAt: now };

  const next = await patchOrganizationOnboardingState(organization.id, patch);
  if (!next) {
    return { error: "Unable to save progress." };
  }

  const following = nextOnboardingPrompt(next);
  revalidateOnboardingPaths();

  if (!following) {
    await patchOrganizationOnboardingState(organization.id, {
      promptsFinishedAt: now,
    });
    redirect("/dashboard");
  }

  redirect(`/onboarding/${following}`);
}

export async function completeOnboardingCalendarAction() {
  const organization = await getCurrentOrganization();
  if (!organization) {
    return { error: "Workspace not found." };
  }

  const now = new Date().toISOString();
  const next = await patchOrganizationOnboardingState(organization.id, {
    calendarCompletedAt: now,
  });
  if (!next) {
    return { error: "Unable to save progress." };
  }

  revalidateOnboardingPaths();
  redirect("/calendar/import");
}

export async function saveOnboardingBrandAction(formData: FormData) {
  const organization = await getCurrentOrganization();
  if (!organization) {
    return { error: "Workspace not found." };
  }

  const primaryColor = formData.get("primaryColor")?.toString() ?? null;
  const secondaryColor = formData.get("secondaryColor")?.toString() ?? null;
  const mascot = formData.get("mascot")?.toString() ?? null;
  const logo = formData.get("ptoLogo");
  const ptoLogo = logo instanceof File && logo.size > 0 ? logo : null;

  const result = await updateOrganizationBrand({
    organizationId: organization.id,
    mascot,
    primaryColor,
    secondaryColor,
    ptoLogo,
  });

  if (result.error) {
    return { error: result.error };
  }

  const now = new Date().toISOString();
  await patchOrganizationOnboardingState(organization.id, {
    brandCompletedAt: now,
  });

  revalidateOnboardingPaths();
  redirect("/onboarding/invite");
}

export async function finishOnboardingPromptsAction() {
  const organization = await getCurrentOrganization();
  if (!organization) {
    return { error: "Workspace not found." };
  }

  await patchOrganizationOnboardingState(organization.id, {
    promptsFinishedAt: new Date().toISOString(),
  });
  revalidateOnboardingPaths();
  redirect("/dashboard");
}

export async function sendOnboardingInviteAction(formData: FormData) {
  const organization = await getCurrentOrganization();
  if (!organization) {
    return { error: "Workspace not found." };
  }

  const workspace = await getOrganizationWorkspaceData(organization.id);
  const defaultRoleId =
    workspace?.roles.find((role) =>
      /president|admin|owner/i.test(role.name),
    )?.id ??
    workspace?.roles[0]?.id ??
    "";

  if (!formData.get("organizationRoleId") && defaultRoleId) {
    formData.set("organizationRoleId", defaultRoleId);
  }
  if (!formData.get("campaignRole")) {
    formData.set("campaignRole", "admin");
  }
  formData.set("sendEmail", "true");

  const result = await inviteTeamMemberAction(
    { error: null, success: false },
    formData,
  );

  if (!result.success) {
    return { error: result.error ?? "Unable to send invite." };
  }

  await patchOrganizationOnboardingState(organization.id, {
    inviteCompletedAt: new Date().toISOString(),
  });

  revalidateOnboardingPaths();
  redirect("/dashboard");
}

export async function getOnboardingChecklistForCurrentOrg(): Promise<{
  items: OnboardingChecklistItem[];
  show: boolean;
} | null> {
  const profile = await getSchoolProfile();
  if (!profile?.organization) {
    return null;
  }

  const organization = profile.organization;
  const state = parseOnboardingState(organization.onboardingState);
  const [schoolYearData, members] = await Promise.all([
    getSchoolYearSettingsData(),
    getOrganizationUsers(organization.id),
  ]);

  const hasCalendarSignal = Boolean(
    schoolYearData?.activeSchoolYear?.calendarSubscribeUrl?.trim() ||
      profile.calendarImport,
  );
  const hasBrandSignal = Boolean(
    profile.brandAssets?.ptoLogo ||
      profile.brandAssets?.schoolLogo ||
      organization.mascot,
  );
  const hasTeamSignal = members.length > 1;

  const items = buildOnboardingChecklist({
    state,
    hasCalendarSignal,
    hasBrandSignal,
    hasTeamSignal,
    firstEventHref: state.firstEventId
      ? `/events/${state.firstEventId}`
      : null,
  });

  const show =
    Boolean(state.startedAt) ||
    items.some((item) => !item.done) ||
    !hasCompletedFirstEvent(state);

  return { items, show };
}
