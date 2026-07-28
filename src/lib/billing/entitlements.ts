/**
 * Plan feature + capacity matrix (credits Phase 5).
 * Source of truth for product rules: docs/ops/ai-credits-matrix.md
 */

import type { AiPlanTier } from "@/lib/ai/credit-constants";
import type { PaidPlanId } from "@/lib/billing/plan-catalog";

export type PlanFeatureKey =
  | "ask_ralli"
  | "volunteer_center"
  | "communication_hub"
  | "inbox_ai"
  | "social_analytics"
  | "custom_dashboard"
  | "custom_roles"
  | "change_requests"
  | "priority_support";

export type PlanCapacityKey =
  | "eventsPerSchoolYear"
  | "teamMembers"
  | "committeeChairs"
  | "metaPostsPerMonth"
  | "socialAccounts";

export type PlanEntitlements = {
  features: Record<PlanFeatureKey, boolean>;
  /** null = unlimited */
  capacity: Record<PlanCapacityKey, number | null>;
};

const STARTER: PlanEntitlements = {
  features: {
    ask_ralli: false,
    volunteer_center: false,
    communication_hub: false,
    inbox_ai: false,
    // Org/Event Insights + Connect Meta empty — shipped "standard analytics"
    // (advanced demographics still deferred). Must stay unlocked for Meta App Review.
    social_analytics: true,
    custom_dashboard: false,
    custom_roles: false,
    change_requests: false,
    priority_support: false,
  },
  capacity: {
    eventsPerSchoolYear: 15,
    teamMembers: 5,
    committeeChairs: 2,
    metaPostsPerMonth: 10,
    socialAccounts: 1,
  },
};

const PROFESSIONAL: PlanEntitlements = {
  features: {
    ask_ralli: true,
    volunteer_center: true,
    communication_hub: true,
    inbox_ai: false,
    social_analytics: true,
    custom_dashboard: false,
    custom_roles: true,
    change_requests: true,
    priority_support: false,
  },
  capacity: {
    eventsPerSchoolYear: null,
    teamMembers: 15,
    committeeChairs: 8,
    metaPostsPerMonth: 40,
    socialAccounts: 1,
  },
};

const PREMIUM: PlanEntitlements = {
  features: {
    ask_ralli: true,
    volunteer_center: true,
    communication_hub: true,
    inbox_ai: true,
    social_analytics: true,
    custom_dashboard: true,
    custom_roles: true,
    change_requests: true,
    priority_support: true,
  },
  capacity: {
    eventsPerSchoolYear: null,
    teamMembers: null,
    committeeChairs: null,
    metaPostsPerMonth: null,
    socialAccounts: null,
  },
};

/** Founding / billing-exempt: Premium entitlements, unlimited capacity. */
const FOUNDING: PlanEntitlements = {
  ...PREMIUM,
  capacity: {
    eventsPerSchoolYear: null,
    teamMembers: null,
    committeeChairs: null,
    metaPostsPerMonth: null,
    socialAccounts: null,
  },
};

/** Active trial: Professional feature set (per matrix). */
const TRIAL_ACTIVE = PROFESSIONAL;

export function entitlementsForEffectiveTier(
  tier: AiPlanTier | "expired_trial",
): PlanEntitlements {
  switch (tier) {
    case "founding":
      return FOUNDING;
    case "premium":
      return PREMIUM;
    case "professional":
    case "trial":
      return TRIAL_ACTIVE;
    case "starter":
    case "expired_trial":
      return STARTER;
    default:
      return STARTER;
  }
}

export function paidPlanIdFromTier(
  tier: AiPlanTier,
): PaidPlanId | null {
  if (tier === "starter" || tier === "professional" || tier === "premium") {
    return tier;
  }
  if (tier === "trial") return "professional";
  return null;
}

export const FEATURE_LABELS: Record<PlanFeatureKey, string> = {
  ask_ralli: "Ask Ralli",
  volunteer_center: "Volunteers",
  communication_hub: "Communication Hub",
  inbox_ai: "AI Inbox replies",
  social_analytics: "Social Analytics",
  custom_dashboard: "Custom Dashboard",
  custom_roles: "Custom roles",
  change_requests: "Change requests",
  priority_support: "Priority support",
};

export const CAPACITY_LABELS: Record<PlanCapacityKey, string> = {
  eventsPerSchoolYear: "events this school year",
  teamMembers: "team members",
  committeeChairs: "committee chairs",
  metaPostsPerMonth: "Meta posts this month",
  socialAccounts: "social accounts",
};

/** Title-case labels for display in the Billing & Plan Usage tab (vs. the sentence-style CAPACITY_LABELS above). */
export const CAPACITY_DISPLAY_LABELS: Record<PlanCapacityKey, string> = {
  teamMembers: "Team Members",
  committeeChairs: "Committee Chairs",
  eventsPerSchoolYear: "Events / School Year",
  metaPostsPerMonth: "Meta Posts / Month",
  socialAccounts: "Social Accounts",
};
