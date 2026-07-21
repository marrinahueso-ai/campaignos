"use server";

import { createClient } from "@/lib/supabase/server";
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

  return askRalliProductHelp({ question, pathname, eventId });
}
