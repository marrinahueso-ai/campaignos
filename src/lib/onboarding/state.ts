import type {
  OnboardingChecklistItem,
  OrganizationOnboardingState,
} from "@/lib/onboarding/types";
import { EMPTY_ONBOARDING_STATE } from "@/lib/onboarding/types";

export function parseOnboardingState(
  raw: unknown,
): OrganizationOnboardingState {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ...EMPTY_ONBOARDING_STATE };
  }

  const value = raw as Record<string, unknown>;
  return {
    version: 1,
    startedAt: asOptionalString(value.startedAt),
    firstEventId: asOptionalString(value.firstEventId),
    firstEventCompletedAt: asOptionalString(value.firstEventCompletedAt),
    calendarCompletedAt: asOptionalString(value.calendarCompletedAt),
    calendarSkippedAt: asOptionalString(value.calendarSkippedAt),
    brandCompletedAt: asOptionalString(value.brandCompletedAt),
    brandSkippedAt: asOptionalString(value.brandSkippedAt),
    inviteCompletedAt: asOptionalString(value.inviteCompletedAt),
    inviteSkippedAt: asOptionalString(value.inviteSkippedAt),
    promptsFinishedAt: asOptionalString(value.promptsFinishedAt),
  };
}

function asOptionalString(value: unknown): string | null | undefined {
  if (value === null) return null;
  if (typeof value === "string" && value.trim()) return value;
  return undefined;
}

export function hasCompletedFirstEvent(
  state: OrganizationOnboardingState,
): boolean {
  return Boolean(state.firstEventId && state.firstEventCompletedAt);
}

export function isCalendarSettled(state: OrganizationOnboardingState): boolean {
  return Boolean(state.calendarCompletedAt || state.calendarSkippedAt);
}

export function isBrandSettled(state: OrganizationOnboardingState): boolean {
  return Boolean(state.brandCompletedAt || state.brandSkippedAt);
}

export function isInviteSettled(state: OrganizationOnboardingState): boolean {
  return Boolean(state.inviteCompletedAt || state.inviteSkippedAt);
}

export function nextOnboardingPrompt(
  state: OrganizationOnboardingState,
): "calendar" | "brand" | "invite" | null {
  if (!hasCompletedFirstEvent(state) || state.promptsFinishedAt) {
    return null;
  }
  if (!isCalendarSettled(state)) return "calendar";
  if (!isBrandSettled(state)) return "brand";
  if (!isInviteSettled(state)) return "invite";
  return null;
}

export function mergeOnboardingState(
  current: OrganizationOnboardingState,
  patch: Partial<OrganizationOnboardingState>,
): OrganizationOnboardingState {
  return {
    ...current,
    ...patch,
    version: 1,
  };
}

export function buildOnboardingChecklist(input: {
  state: OrganizationOnboardingState;
  hasCalendarSignal: boolean;
  hasBrandSignal: boolean;
  hasTeamSignal: boolean;
  firstEventHref: string | null;
}): OnboardingChecklistItem[] {
  const { state, hasCalendarSignal, hasBrandSignal, hasTeamSignal } = input;

  const calendarDone =
    hasCalendarSignal || Boolean(state.calendarCompletedAt);
  const brandDone = hasBrandSignal || Boolean(state.brandCompletedAt);
  const inviteDone = hasTeamSignal || Boolean(state.inviteCompletedAt);
  const firstEventDone = hasCompletedFirstEvent(state);

  const items: OnboardingChecklistItem[] = [];

  if (!firstEventDone) {
    items.push({
      id: "first_event",
      title: "Create your first event",
      description: "Plan one real event — that’s your first win in Hey Ralli.",
      href: "/onboarding",
      cta: "Create event",
      done: false,
      optional: false,
    });
  }

  items.push(
    {
      id: "calendar",
      title: "Import your school calendar",
      description: "Save hours by bringing dates in from ICS or Google.",
      href: "/calendar/import",
      cta: calendarDone ? "View calendar" : "Import calendar",
      done: calendarDone,
      optional: true,
    },
    {
      id: "brand",
      title: "Brand your school",
      description: "Logo, colors, and mascot so campaigns look like you.",
      href: "/onboarding/brand",
      cta: brandDone ? "Edit brand" : "Add brand",
      done: brandDone,
      optional: true,
    },
    {
      id: "invite",
      title: "Invite your team",
      description: "Add PTO admins so approvals and access work for real people.",
      href: "/onboarding/invite",
      cta: inviteDone ? "Manage team" : "Invite team",
      done: inviteDone,
      optional: true,
    },
  );

  return items;
}

export function checklistNeedsAttention(
  items: OnboardingChecklistItem[],
): boolean {
  return items.some((item) => !item.done);
}

export function defaultSchoolYearLabel(date = new Date()): string {
  const year = date.getFullYear();
  const month = date.getMonth();
  if (month >= 6) {
    return `${year} - ${year + 1}`;
  }
  return `${year - 1} - ${year}`;
}
