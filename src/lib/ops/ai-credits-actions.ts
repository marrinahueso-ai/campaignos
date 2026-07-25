"use server";

import { revalidatePath } from "next/cache";
import {
  adjustAiReserveCredits,
  grantAiBonusCredits,
  grantAiReserve,
} from "@/lib/ai/credits";
import {
  AI_RESERVE_SKUS,
  type AiReserveSkuId,
} from "@/lib/ai/credit-constants";
import { canAccessOwnerOps } from "@/lib/ops/access";
import { createClient } from "@/lib/supabase/server";

const SKU_IDS = new Set<string>(Object.keys(AI_RESERVE_SKUS));

function grantErrorMessage(code: string | undefined): string {
  switch (code) {
    case "not_configured":
      return "Credits service is not configured.";
    case "unknown_sku":
      return "Unknown Reserve package.";
    case "balance_missing":
      return "Could not load or create the org credit balance.";
    case "invalid_amount":
      return "Enter a valid non-zero credit amount.";
    case "amount_too_large":
      return "Amount exceeds the Owner grant limit (100,000).";
    case "insufficient_reserve":
      return "Adjustment would drive Reserve below zero.";
    case "note_required":
      return "A note is required for adjustments.";
    default:
      return code?.trim() || "Could not apply credit grant.";
  }
}

async function requireOwnerActor(): Promise<
  | { ok: true; userId: string }
  | { ok: false; error: string }
> {
  if (!(await canAccessOwnerOps())) {
    return { ok: false, error: "Not authorized." };
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id) {
    return { ok: false, error: "Not signed in." };
  }
  return { ok: true, userId: user.id };
}

function finishOk(creditsGranted: number, label: string) {
  revalidatePath("/ops/ai-apis");
  return {
    success: true as const,
    creditsGranted,
    message: `${label}: ${creditsGranted > 0 ? "+" : ""}${creditsGranted.toLocaleString()} Reserve credits.`,
  };
}

export async function grantAiReserveAction(input: {
  organizationId: string;
  sku: string;
  note?: string;
}): Promise<
  | { success: true; creditsGranted: number; message: string }
  | { success: false; error: string }
> {
  const actor = await requireOwnerActor();
  if (!actor.ok) return { success: false, error: actor.error };

  const sku = input.sku as AiReserveSkuId;
  if (!SKU_IDS.has(sku)) {
    return { success: false, error: grantErrorMessage("unknown_sku") };
  }

  const result = await grantAiReserve({
    organizationId: input.organizationId,
    sku,
    actorUserId: actor.userId,
    note: input.note,
  });

  if (!result.ok) {
    return { success: false, error: grantErrorMessage(result.error) };
  }

  const label = AI_RESERVE_SKUS[sku].label;
  return finishOk(result.creditsGranted, label);
}

export async function grantAiBonusAction(input: {
  organizationId: string;
  credits: number;
  note?: string;
}): Promise<
  | { success: true; creditsGranted: number; message: string }
  | { success: false; error: string }
> {
  const actor = await requireOwnerActor();
  if (!actor.ok) return { success: false, error: actor.error };

  const result = await grantAiBonusCredits({
    organizationId: input.organizationId,
    credits: input.credits,
    actorUserId: actor.userId,
    note: input.note,
  });

  if (!result.ok) {
    return { success: false, error: grantErrorMessage(result.error) };
  }

  return finishOk(result.creditsGranted, "Owner bonus");
}

export async function adjustAiReserveAction(input: {
  organizationId: string;
  delta: number;
  note: string;
}): Promise<
  | { success: true; creditsGranted: number; message: string }
  | { success: false; error: string }
> {
  const actor = await requireOwnerActor();
  if (!actor.ok) return { success: false, error: actor.error };

  const result = await adjustAiReserveCredits({
    organizationId: input.organizationId,
    delta: input.delta,
    actorUserId: actor.userId,
    note: input.note,
  });

  if (!result.ok) {
    return { success: false, error: grantErrorMessage(result.error) };
  }

  return finishOk(result.creditsGranted, "Reserve adjustment");
}
