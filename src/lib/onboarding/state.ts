import type {
  OnboardingChecklistItem,
  OnboardingPromptStep,
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
    calendarChecklistDismissedAt: asOptionalString(
      value.calendarChecklistDismissedAt,
    ),
    brandCompletedAt: asOptionalString(value.brandCompletedAt),
    brandSkippedAt: asOptionalString(value.brandSkippedAt),
    brandChecklistDismissedAt: asOptionalString(
      value.brandChecklistDismissedAt,
    ),
    inviteCompletedAt: asOptionalString(value.inviteCompletedAt),
    inviteSkippedAt: asOptionalString(value.inviteSkippedAt),
    inviteChecklistDismissedAt: asOptionalString(
      value.inviteChecklistDismissedAt,
    ),
    metaCompletedAt: asOptionalString(value.metaCompletedAt),
    metaSkippedAt: asOptionalString(value.metaSkippedAt),
    metaChecklistDismissedAt: asOptionalString(value.metaChecklistDismissedAt),
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

export function isMetaSettled(state: OrganizationOnboardingState): boolean {
  return Boolean(state.metaCompletedAt || state.metaSkippedAt);
}

export function nextOnboardingPrompt(
  state: OrganizationOnboardingState,
): OnboardingPromptStep | null {
  if (!hasCompletedFirstEvent(state) || state.promptsFinishedAt) {
    return null;
  }
  if (!isCalendarSettled(state)) return "calendar";
  if (!isBrandSettled(state)) return "brand";
  if (!isInviteSettled(state)) return "invite";
  if (!isMetaSettled(state)) return "meta";
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
  hasMetaSignal: boolean;
  firstEventHref: string | null;
}): OnboardingChecklistItem[] {
  const {
    state,
    hasCalendarSignal,
    hasBrandSignal,
    hasTeamSignal,
    hasMetaSignal,
  } = input;

  // Overlay "Do this later" sets *SkippedAt — those items must still surface here
  // even if the org already has calendar/brand/team/meta signals (restart / mature orgs).
  // Checklist "Later" sets *ChecklistDismissedAt. Signals only auto-complete when
  // the step was not deferred in the current onboarding run.
  const calendarDone =
    Boolean(state.calendarChecklistDismissedAt) ||
    Boolean(state.calendarCompletedAt) ||
    (hasCalendarSignal && !state.calendarSkippedAt);
  const brandDone =
    Boolean(state.brandChecklistDismissedAt) ||
    Boolean(state.brandCompletedAt) ||
    (hasBrandSignal && !state.brandSkippedAt);
  const inviteDone =
    Boolean(state.inviteChecklistDismissedAt) ||
    Boolean(state.inviteCompletedAt) ||
    (hasTeamSignal && !state.inviteSkippedAt);
  const metaDone =
    Boolean(state.metaChecklistDismissedAt) ||
    Boolean(state.metaCompletedAt) ||
    (hasMetaSignal && !state.metaSkippedAt);
  const firstEventDone = hasCompletedFirstEvent(state);

  const items: OnboardingChecklistItem[] = [];

  if (!firstEventDone) {
    items.push({
      id: "first_event",
      title: "Create your first event",
      description: "Pick something on the calendar and we’ll help you plan from there.",
      href: "/onboarding",
      cta: "Set up now",
      done: false,
      optional: false,
    });
  }

  items.push(
    {
      id: "calendar",
      title: "Bring in your school calendar",
      description: "Add your year’s dates so nothing important gets missed.",
      href: "/calendar/import",
      cta: calendarDone ? "View calendar" : "Set up now",
      done: calendarDone,
      optional: true,
    },
    {
      id: "brand",
      title: "Build your brand kit",
      description: "Logos and colors so every campaign feels like your school.",
      href: "/onboarding/brand",
      cta: brandDone ? "Edit brand kit" : "Set up now",
      done: brandDone,
      optional: true,
    },
    {
      id: "invite",
      title: "Invite a teammate",
      description: "Bring in another board member when you’re ready to share the work.",
      href: "/onboarding/invite",
      cta: inviteDone ? "View team" : "Set up now",
      done: inviteDone,
      optional: true,
    },
    {
      id: "meta",
      title: "Connect Facebook & Instagram",
      description: "Link your PTO page so approved posts can publish automatically.",
      href: "/settings/meta",
      cta: metaDone ? "View Meta" : "Set up now",
      done: metaDone,
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
