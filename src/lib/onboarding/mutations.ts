import "server-only";

import { createClient } from "@/lib/supabase/server";
import {
  mergeOnboardingState,
  parseOnboardingState,
} from "@/lib/onboarding/state";
import type { OrganizationOnboardingState } from "@/lib/onboarding/types";

export async function getOrganizationOnboardingState(
  organizationId: string,
): Promise<OrganizationOnboardingState> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("organizations")
    .select("onboarding_state")
    .eq("id", organizationId)
    .maybeSingle();

  if (error) {
    console.error("Failed to load onboarding_state:", error.message);
    return parseOnboardingState(null);
  }

  return parseOnboardingState(data?.onboarding_state);
}

export async function patchOrganizationOnboardingState(
  organizationId: string,
  patch: Partial<OrganizationOnboardingState>,
): Promise<OrganizationOnboardingState | null> {
  const current = await getOrganizationOnboardingState(organizationId);
  const next = mergeOnboardingState(current, patch);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("organizations")
    .update({ onboarding_state: next })
    .eq("id", organizationId)
    .select("onboarding_state")
    .maybeSingle();

  if (error) {
    console.error("Failed to update onboarding_state:", error.message);
    return null;
  }

  return parseOnboardingState(data?.onboarding_state);
}
