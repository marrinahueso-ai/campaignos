"use server";

import { revalidatePath } from "next/cache";

import { hasPermission, requirePermission } from "@/lib/access-templates/effective-access";
import { getActiveMembership } from "@/lib/auth/membership-queries";
import { getAuthUser } from "@/lib/auth/queries";
import { getCurrentOrganization } from "@/lib/auth/organization-context";
import { buildFlyerComposerMilestoneId } from "@/lib/flyer-composer/approval";
import { getFlyerById } from "@/lib/flyers/queries";
import type {
  FlyerComposerState,
  FlyerPrintSize,
  FlyerStatus,
} from "@/lib/flyers/types";
import { isFlyerPrintSize } from "@/lib/flyers/types";
import { createClient } from "@/lib/supabase/server";

function revalidateFlyer(flyerId?: string | null) {
  revalidatePath("/flyers");
  revalidatePath("/create-with-ai/flyer");
  if (flyerId) {
    revalidatePath(`/flyers/${flyerId}`);
    revalidatePath(`/flyers/${flyerId}/review`);
    revalidatePath(`/flyers/${flyerId}/changes`);
    revalidatePath(`/create-with-ai/flyer?flyerId=${flyerId}`);
  }
}

/** Quiet builder persist: update library cards without remounting the builder. */
function revalidateFlyerQuiet(flyerId?: string | null) {
  revalidatePath("/flyers");
  if (flyerId) {
    revalidatePath(`/flyers/${flyerId}`);
  }
}

/**
 * Auth user id for FKs that reference `auth.users` (created_by, approved_by, …).
 * Do NOT use EffectiveAccess.membershipId — that is `organization_users.id`.
 */
async function resolveAuthActorUserId(): Promise<string | null> {
  const authUser = await getAuthUser();
  if (authUser?.id) return authUser.id;
  const membership = await getActiveMembership();
  return membership?.user.userId ?? null;
}

async function requireFlyerContext(): Promise<
  | { ok: true; organizationId: string; actorUserId: string | null }
  | { ok: false; error: string }
> {
  const organization = await getCurrentOrganization();
  if (!organization) {
    return { ok: false, error: "Sign in and set up your organization first." };
  }
  const actorUserId = await resolveAuthActorUserId();
  return { ok: true, organizationId: organization.id, actorUserId };
}

function normalizePrintSize(value: unknown): FlyerPrintSize | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return isFlyerPrintSize(trimmed) ? trimmed : undefined;
}

export type CreateFlyerResult =
  | { ok: true; flyerId: string }
  | { ok: false; error: string };

export async function createFlyer(input?: {
  title?: string;
  eventId?: string | null;
  printSize?: FlyerPrintSize;
}): Promise<CreateFlyerResult> {
  const access = await requirePermission("upload_artwork");
  if ("error" in access) {
    return { ok: false, error: access.error };
  }

  const actorUserId = await resolveAuthActorUserId();
  const supabase = await createClient();
  const printSize = normalizePrintSize(input?.printSize) ?? "letter";
  const title = input?.title?.trim() ?? "";
  const eventId = input?.eventId?.trim() || null;

  const { data, error } = await supabase
    .from("flyers")
    .insert({
      organization_id: access.organizationId,
      event_id: eventId,
      title,
      status: "draft" satisfies FlyerStatus,
      print_size: printSize,
      composer_state: {},
      created_by: actorUserId,
      updated_by: actorUserId,
    })
    .select("id")
    .maybeSingle();

  if (error || !data?.id) {
    console.error("flyer createFlyer failed:", error?.message);
    return { ok: false, error: error?.message ?? "Unable to create flyer draft." };
  }

  revalidateFlyer(data.id);
  return { ok: true, flyerId: data.id };
}

export type UpdateFlyerDraftResult =
  | { ok: true }
  | { ok: false; error: string };

export async function updateFlyerDraft(input: {
  flyerId: string;
  title?: string;
  eventId?: string | null;
  printSize?: FlyerPrintSize;
  composerState?: FlyerComposerState;
  previewImageUrl?: string | null;
  /** Builder persist/generate: skip library path remounts. */
  quiet?: boolean;
}): Promise<UpdateFlyerDraftResult> {
  const access = await requirePermission("upload_artwork");
  if ("error" in access) {
    return { ok: false, error: access.error };
  }

  const flyerId = input.flyerId.trim();
  if (!flyerId) return { ok: false, error: "Flyer id is required." };

  const existing = await getFlyerById(access.organizationId, flyerId);
  if (!existing) return { ok: false, error: "Flyer not found." };

  const actorUserId = await resolveAuthActorUserId();
  const now = new Date().toISOString();
  const patch: Record<string, unknown> = {
    updated_by: actorUserId,
    updated_at: now,
  };

  if (input.title !== undefined) patch.title = input.title;
  if (input.eventId !== undefined) patch.event_id = input.eventId?.trim() || null;
  if (input.printSize !== undefined) {
    const printSize = normalizePrintSize(input.printSize);
    if (!printSize) return { ok: false, error: "Invalid print size." };
    patch.print_size = printSize;
  }
  if (input.composerState !== undefined) {
    patch.composer_state = input.composerState;
  }
  if (input.previewImageUrl !== undefined) {
    patch.preview_image_url = input.previewImageUrl;
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("flyers")
    .update(patch)
    .eq("id", flyerId)
    .eq("organization_id", access.organizationId);

  if (error) {
    console.error("flyer updateFlyerDraft failed:", error.message);
    return { ok: false, error: error.message };
  }

  if (!input.quiet) {
    revalidateFlyer(flyerId);
  } else {
    revalidateFlyerQuiet(flyerId);
  }
  return { ok: true };
}

const DELETABLE_FLYER_STATUSES = new Set<FlyerStatus>([
  "draft",
  "changes_requested",
  "needs_approval",
]);

export async function deleteFlyer(input: {
  flyerId: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!(await hasPermission("upload_artwork"))) {
    return { ok: false, error: "You do not have permission to delete flyers." };
  }

  const context = await requireFlyerContext();
  if (!context.ok) return { ok: false, error: context.error };

  const flyerId = input.flyerId.trim();
  if (!flyerId) return { ok: false, error: "Flyer id is required." };

  const existing = await getFlyerById(context.organizationId, flyerId);
  if (!existing) return { ok: false, error: "Flyer not found." };

  if (!DELETABLE_FLYER_STATUSES.has(existing.status)) {
    return {
      ok: false,
      error: "Approved flyers can’t be deleted from the library.",
    };
  }

  const supabase = await createClient();
  const milestoneId = buildFlyerComposerMilestoneId(flyerId);

  await supabase
    .from("approval_scheduling_items")
    .delete()
    .eq("organization_id", context.organizationId)
    .eq("campaign_milestone_id", milestoneId);

  const { error } = await supabase
    .from("flyers")
    .delete()
    .eq("id", flyerId)
    .eq("organization_id", context.organizationId);

  if (error) {
    console.error("Failed to delete flyer:", error.message);
    return { ok: false, error: "Could not delete that flyer. Try again." };
  }

  revalidateFlyer(flyerId);
  return { ok: true };
}

/**
 * Request-changes path used by the org Approvals hub: rolls the flyer
 * back to `changes_requested` with a note. Gated on `approve_comms`.
 */
export async function requestFlyerChangesForApprovalsHub(input: {
  flyerId: string;
  note: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!(await hasPermission("approve_comms"))) {
    return { ok: false, error: "You don’t have permission to request changes." };
  }

  const organization = await getCurrentOrganization();
  if (!organization) {
    return { ok: false, error: "Sign in and set up your organization first." };
  }

  const flyer = await getFlyerById(organization.id, input.flyerId);
  if (!flyer) {
    return { ok: false, error: "Flyer not found." };
  }

  const note = input.note.trim();
  const supabase = await createClient();
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("flyers")
    .update({
      status: "changes_requested",
      change_request_note: note || null,
      updated_at: now,
    })
    .eq("id", input.flyerId)
    .eq("organization_id", organization.id);

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidateFlyer(input.flyerId);
  return { ok: true };
}

/** Approve path used by the Approvals hub: marks the flyer approved. */
export async function approveFlyerForApprovalsHub(input: {
  flyerId: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!(await hasPermission("approve_comms"))) {
    return { ok: false, error: "You don’t have permission to approve this." };
  }

  const organization = await getCurrentOrganization();
  if (!organization) {
    return { ok: false, error: "Sign in and set up your organization first." };
  }

  const flyer = await getFlyerById(organization.id, input.flyerId);
  if (!flyer) {
    return { ok: false, error: "Flyer not found." };
  }

  if (flyer.status !== "needs_approval" && flyer.status !== "changes_requested") {
    return { ok: false, error: "This flyer is not waiting for approval." };
  }

  const actorUserId = await resolveAuthActorUserId();
  const supabase = await createClient();
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("flyers")
    .update({
      status: "approved",
      approved_by: actorUserId,
      approved_at: now,
      change_request_note: null,
      updated_at: now,
    })
    .eq("id", input.flyerId)
    .eq("organization_id", organization.id);

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidateFlyer(input.flyerId);
  return { ok: true };
}

/**
 * After a successful Approvals hub upsert: mark the flyer as awaiting review.
 * Called from `sendFlyerComposerForApproval` (not a direct UI action).
 */
export async function markFlyerNeedsApproval(input: {
  flyerId: string;
  schedulingItemId: string;
  previewImageUrl?: string | null;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const organization = await getCurrentOrganization();
  if (!organization) {
    return { ok: false, error: "Sign in and set up your organization first." };
  }

  const flyer = await getFlyerById(organization.id, input.flyerId);
  if (!flyer) {
    return { ok: false, error: "Flyer not found." };
  }

  const actorUserId = await resolveAuthActorUserId();
  const supabase = await createClient();
  const now = new Date().toISOString();
  const patch: Record<string, unknown> = {
    status: "needs_approval",
    approval_scheduling_item_id: input.schedulingItemId,
    change_request_note: null,
    submitted_at: now,
    submitted_by: actorUserId,
    updated_at: now,
  };
  if (input.previewImageUrl !== undefined) {
    patch.preview_image_url = input.previewImageUrl;
  }

  const { error } = await supabase
    .from("flyers")
    .update(patch)
    .eq("id", input.flyerId)
    .eq("organization_id", organization.id);

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidateFlyer(input.flyerId);
  return { ok: true };
}
