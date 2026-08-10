import "server-only";

import {
  hasPermission,
  requirePermission,
} from "@/lib/access-templates/effective-access";
import type { EffectiveAccess } from "@/lib/access-templates/effective-access-core";

/**
 * Newsletter permission model.
 *
 * Newsletters reuse `AccessPermissionKey` from `@/lib/access-templates/types`
 * (see `ACCESS_PERMISSION_KEYS` / `DEFAULT_ACCESS_TEMPLATES`) with two
 * newsletter-specific keys added there:
 *
 *  - `send_newsletter`             — production Send Now / Schedule /
 *    cancel / reschedule. Defaults true for admin / president /
 *    vp_communications, false otherwise. Approving a newsletter does NOT
 *    require this permission.
 *  - `manage_newsletter_contacts`  — create/import contacts, manage
 *    audiences and audience membership. Defaults true for
 *    admin / president / vp_communications, false otherwise.
 *
 * `draft_edit` alone is enough to create/edit a newsletter draft, send a
 * TEST email (manual recipients only), and submit for approval (via
 * `submit_approval`). Committee chairs and contributors can draft and test
 * even when they cannot production-send or manage contacts.
 */

export async function canSendNewsletter(): Promise<boolean> {
  return hasPermission("send_newsletter");
}

export async function canManageNewsletterContacts(): Promise<boolean> {
  return hasPermission("manage_newsletter_contacts");
}

export async function requireSendNewsletterAccess(): Promise<
  EffectiveAccess | { error: string }
> {
  return requirePermission("send_newsletter");
}

export async function requireManageNewsletterContactsAccess(): Promise<
  EffectiveAccess | { error: string }
> {
  return requirePermission("manage_newsletter_contacts");
}

export async function requireNewsletterDraftAccess(): Promise<
  EffectiveAccess | { error: string }
> {
  return requirePermission("draft_edit");
}

export async function requireNewsletterSubmitApprovalAccess(): Promise<
  EffectiveAccess | { error: string }
> {
  return requirePermission("submit_approval");
}
