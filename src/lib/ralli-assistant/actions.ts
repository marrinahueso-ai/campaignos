"use server";

import { createClient } from "@/lib/supabase/server";
import { getActiveMembership } from "@/lib/auth/membership-queries";
import { assertOrgFeature } from "@/lib/billing/gates";
import {
  askRalliProductHelp,
  type AskRalliEventOption,
  type AskRalliSource,
} from "@/lib/ralli-assistant/ask";
import type { ProductHelpLink } from "@/lib/ralli-assistant/product-help-knowledge";

export type AskRalliAssistantActionResult = {
  success: boolean;
  answer: string | null;
  links: ProductHelpLink[];
  eventOptions: AskRalliEventOption[];
  source: AskRalliSource | null;
  error: string | null;
};

export async function askRalliAssistantAction(
  question: string,
  pathname?: string | null,
  eventId?: string | null,
): Promise<AskRalliAssistantActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      success: false,
      answer: null,
      links: [],
      eventOptions: [],
      source: null,
      error: "Please sign in to ask Ralli AI.",
    };
  }

  const membership = await getActiveMembership();
  if (!membership?.organizationId) {
    // Fail closed: no active org membership means no billing plan to check,
    // so this must not fall through to unmetered AI calls.
    return {
      success: false,
      answer: null,
      links: [],
      eventOptions: [],
      source: null,
      error: "Join or set up an organization to use Ask Ralli.",
    };
  }

  const gate = await assertOrgFeature(membership.organizationId, "ask_ralli");
  if (!gate.ok) {
    return {
      success: false,
      answer: null,
      links: [],
      eventOptions: [],
      source: null,
      error: `${gate.message} ${gate.upgradeHint}`,
    };
  }

  return askRalliProductHelp({ question, pathname, eventId });
}
