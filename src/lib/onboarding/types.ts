export type OnboardingPromptStep = "calendar" | "brand" | "invite";

export interface OrganizationOnboardingState {
  version: 1;
  /** Set when welcome CTA is used / org bootstrapped for value-first flow */
  startedAt?: string | null;
  firstEventId?: string | null;
  firstEventCompletedAt?: string | null;
  calendarCompletedAt?: string | null;
  calendarSkippedAt?: string | null;
  /** Dismissed from Helpful next steps via Later (overlay skip still surfaces the card) */
  calendarChecklistDismissedAt?: string | null;
  brandCompletedAt?: string | null;
  brandSkippedAt?: string | null;
  brandChecklistDismissedAt?: string | null;
  inviteCompletedAt?: string | null;
  inviteSkippedAt?: string | null;
  inviteChecklistDismissedAt?: string | null;
  /** User finished or dismissed the post-event prompt sequence */
  promptsFinishedAt?: string | null;
}

export const EMPTY_ONBOARDING_STATE: OrganizationOnboardingState = {
  version: 1,
};

export interface OnboardingChecklistItem {
  id: "calendar" | "brand" | "invite" | "first_event";
  title: string;
  description: string;
  href: string;
  cta: string;
  done: boolean;
  optional: boolean;
}
