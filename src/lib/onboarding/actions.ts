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
  writeOrganizationOnboardingState,
} from "@/lib/onboarding/mutations";
import {
  buildOnboardingChecklist,
  hasCompletedFirstEvent,
  isBrandSettled,
  isCalendarSettled,
  isInviteSettled,
  isMetaSettled,
  nextOnboardingPrompt,
  parseOnboardingState,
} from "@/lib/onboarding/state";
import type {
  OnboardingChecklistDismissStep,
  OnboardingChecklistItem,
  OnboardingPromptStep,
} from "@/lib/onboarding/types";
import { EMPTY_ONBOARDING_STATE } from "@/lib/onboarding/types";
import {
  bootstrapMinimalOrganization,
  updateOrganizationBrand,
  type BrandKitLogoCategory,
} from "@/lib/organizations/mutations";
import { getSchoolProfile } from "@/lib/organizations/queries";
import { getSchoolYearSettingsData } from "@/lib/school-years/actions";
import { getOrganizationWorkspaceData } from "@/lib/organization-workspace/queries";
import {
  getMetaConnectionForCurrentOrg,
  isMetaConnectionConfigured,
} from "@/lib/meta-publishing/connection";

function revalidateOnboardingPaths() {
  revalidatePath("/dashboard");
  revalidatePath("/onboarding");
  revalidatePath("/settings/school-setup");
  revalidatePath("/events");
  revalidatePath("/settings/meta");
}

function onboardingPromptDestination(
  step: OnboardingPromptStep,
  firstEventId?: string | null,
): string {
  if (step === "calendar" && firstEventId) {
    return `/events/${firstEventId}?onboarding=calendar`;
  }
  if (step === "meta") {
    return firstEventId
      ? `/events/${firstEventId}?onboarding=meta`
      : "/settings/meta";
  }
  return `/onboarding/${step}`;
}

function skipPatchForStep(
  step: OnboardingPromptStep,
  now: string,
): Partial<{
  calendarSkippedAt: string;
  brandSkippedAt: string;
  inviteSkippedAt: string;
  metaSkippedAt: string;
}> {
  if (step === "calendar") return { calendarSkippedAt: now };
  if (step === "brand") return { brandSkippedAt: now };
  if (step === "invite") return { inviteSkippedAt: now };
  return { metaSkippedAt: now };
}

function dismissPatchForStep(
  step: OnboardingChecklistDismissStep,
  current: Awaited<ReturnType<typeof getOrganizationOnboardingState>>,
  now: string,
) {
  if (step === "calendar") {
    return {
      calendarChecklistDismissedAt: now,
      ...(!isCalendarSettled(current) ? { calendarSkippedAt: now } : {}),
    };
  }
  if (step === "brand") {
    return {
      brandChecklistDismissedAt: now,
      ...(!isBrandSettled(current) ? { brandSkippedAt: now } : {}),
    };
  }
  if (step === "invite") {
    return {
      inviteChecklistDismissedAt: now,
      ...(!isInviteSettled(current) ? { inviteSkippedAt: now } : {}),
    };
  }
  return {
    metaChecklistDismissedAt: now,
    ...(!isMetaSettled(current) ? { metaSkippedAt: now } : {}),
  };
}

/** Clear first-time progress so Welcome → create event can run again (same org). */
export async function restartOnboardingAction() {
  const organization = await getCurrentOrganization();
  if (!organization) {
    redirect("/onboarding?welcome=1");
  }

  const now = new Date().toISOString();
  await writeOrganizationOnboardingState(organization.id, {
    ...EMPTY_ONBOARDING_STATE,
    startedAt: now,
  });

  revalidateOnboardingPaths();
  redirect("/onboarding?welcome=1");
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
    // Org already onboarded — go create another event in onboarding mode.
    redirect("/events/create?onboarding=1");
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

async function deferOnboardingPromptStep(
  step: OnboardingPromptStep,
): Promise<
  | { error: string; next?: undefined }
  | { error?: undefined; next: OnboardingPromptStep | null }
> {
  const organization = await getCurrentOrganization();
  if (!organization) {
    return { error: "Workspace not found." };
  }

  const now = new Date().toISOString();
  const next = await patchOrganizationOnboardingState(
    organization.id,
    skipPatchForStep(step, now),
  );
  if (!next) {
    return { error: "Unable to save progress." };
  }

  const following = nextOnboardingPrompt(next);
  revalidateOnboardingPaths();

  if (!following) {
    await patchOrganizationOnboardingState(organization.id, {
      promptsFinishedAt: now,
    });
    return { next: null };
  }

  return { next: following };
}

/** Skip a prompt and redirect to the next onboarding page (or home). */
export async function skipOnboardingPromptAction(step: OnboardingPromptStep) {
  const result = await deferOnboardingPromptStep(step);
  if (result.error) {
    return { error: result.error };
  }

  if (!result.next) {
    redirect("/dashboard");
  }

  const organization = await getCurrentOrganization();
  const state = organization
    ? await getOrganizationOnboardingState(organization.id)
    : null;
  redirect(onboardingPromptDestination(result.next, state?.firstEventId));
}

/**
 * Skip a prompt without leaving the current page.
 * Used by the event-page overlay so "Do this later" advances the stepper in place.
 */
export async function deferOnboardingPromptAction(step: OnboardingPromptStep) {
  return deferOnboardingPromptStep(step);
}

/**
 * Dismiss one Helpful next steps card via Later.
 * Marks the checklist item done without requiring setup; does not reverse
 * overlay skip behavior (skipped-but-not-dismissed items still appear).
 */
export async function dismissOnboardingChecklistItemAction(
  step: OnboardingChecklistDismissStep,
): Promise<{ error?: string; ok?: true }> {
  const organization = await getCurrentOrganization();
  if (!organization) {
    return { error: "Workspace not found." };
  }

  const current = await getOrganizationOnboardingState(organization.id);
  const now = new Date().toISOString();
  const next = await patchOrganizationOnboardingState(
    organization.id,
    dismissPatchForStep(step, current, now),
  );
  if (!next) {
    return { error: "Unable to save progress." };
  }

  if (!nextOnboardingPrompt(next) && !next.promptsFinishedAt) {
    await patchOrganizationOnboardingState(organization.id, {
      promptsFinishedAt: now,
    });
  }

  revalidateOnboardingPaths();
  return { ok: true };
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

/**
 * Mark Meta prompt complete and open Meta connect.
 * Optional returnTo keeps the event overlay journey coherent after OAuth.
 */
export async function completeOnboardingMetaAction(returnTo?: string) {
  const organization = await getCurrentOrganization();
  if (!organization) {
    return { error: "Workspace not found." };
  }

  const now = new Date().toISOString();
  const next = await patchOrganizationOnboardingState(organization.id, {
    metaCompletedAt: now,
  });
  if (!next) {
    return { error: "Unable to save progress." };
  }

  revalidateOnboardingPaths();

  const safeReturn =
    typeof returnTo === "string" &&
    returnTo.startsWith("/") &&
    !returnTo.startsWith("//")
      ? returnTo
      : next.firstEventId
        ? `/events/${next.firstEventId}`
        : "/dashboard";

  redirect(
    `/settings/meta?returnTo=${encodeURIComponent(safeReturn)}`,
  );
}

function fileFromFormData(formData: FormData, key: string): File | null {
  const value = formData.get(key);
  return value instanceof File && value.size > 0 ? value : null;
}

export async function saveOnboardingBrandAction(formData: FormData) {
  const organization = await getCurrentOrganization();
  if (!organization) {
    return { error: "Workspace not found." };
  }

  const primaryColor = formData.get("primaryColor")?.toString() ?? null;
  const secondaryColor = formData.get("secondaryColor")?.toString() ?? null;
  const mascot = formData.get("mascot")?.toString() ?? null;
  const ptoLogo = fileFromFormData(formData, "ptoLogo");
  const schoolLogo = fileFromFormData(formData, "schoolLogo");

  const extraFiles = formData
    .getAll("extraLogo")
    .filter((value): value is File => value instanceof File && value.size > 0);
  const extraCategories = formData.getAll("extraLogoCategory").map(String);
  const extraLabels = formData.getAll("extraLogoLabel").map(String);

  const extraLogos = extraFiles.map((file, index) => {
    const rawCategory = extraCategories[index] ?? "other";
    const category: BrandKitLogoCategory =
      rawCategory === "pto_logo" || rawCategory === "school_logo"
        ? rawCategory
        : "other";
    return {
      file,
      category,
      label: extraLabels[index]?.trim() || undefined,
    };
  });

  const result = await updateOrganizationBrand({
    organizationId: organization.id,
    mascot,
    primaryColor,
    secondaryColor,
    ptoLogo,
    schoolLogo,
    extraLogos,
  });

  if (result.error) {
    return {
      error: result.error,
      ptoLogoUrl: result.ptoLogoUrl ?? null,
      schoolLogoUrl: result.schoolLogoUrl ?? null,
      extraLogos: result.extraLogos ?? [],
    };
  }

  const now = new Date().toISOString();
  await patchOrganizationOnboardingState(organization.id, {
    brandCompletedAt: now,
  });

  revalidateOnboardingPaths();
  revalidatePath("/onboarding/brand");

  return {
    success: true as const,
    ptoLogoUrl: result.ptoLogoUrl ?? null,
    schoolLogoUrl: result.schoolLogoUrl ?? null,
    extraLogos: result.extraLogos ?? [],
  };
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

  const state = await patchOrganizationOnboardingState(organization.id, {
    inviteCompletedAt: new Date().toISOString(),
  });

  revalidateOnboardingPaths();

  if (state?.firstEventId && !isMetaSettled(state)) {
    redirect(`/events/${state.firstEventId}?onboarding=meta`);
  }
  redirect("/settings/meta");
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
  const [schoolYearData, members, metaConnection] = await Promise.all([
    getSchoolYearSettingsData(),
    getOrganizationUsers(organization.id),
    getMetaConnectionForCurrentOrg(),
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
  const hasMetaSignal = isMetaConnectionConfigured(metaConnection);

  const items = buildOnboardingChecklist({
    state,
    hasCalendarSignal,
    hasBrandSignal,
    hasTeamSignal,
    hasMetaSignal,
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
