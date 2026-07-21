"use server";

import { createClient } from "@/lib/supabase/server";
import {
  askRalliProductHelp,
  type AskRalliSource,
} from "@/lib/ralli-assistant/ask";
import type { ProductHelpLink } from "@/lib/ralli-assistant/product-help-knowledge";

export type AskRalliAssistantActionResult = {
  success: boolean;
  answer: string | null;
  links: ProductHelpLink[];
  source: AskRalliSource | null;
  error: string | null;
};

export async function askRalliAssistantAction(
  question: string,
  pathname?: string | null,
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
      source: null,
      error: "Please sign in to ask Ralli AI.",
    };
  }

  return askRalliProductHelp({ question, pathname });
}
