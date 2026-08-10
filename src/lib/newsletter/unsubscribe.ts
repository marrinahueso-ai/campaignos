import "server-only";

import { randomBytes, createHash } from "node:crypto";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/** Raw token is only ever returned to the caller once — never stored. */
export function createRawUnsubscribeToken(): string {
  return randomBytes(32).toString("hex");
}

export function hashUnsubscribeToken(rawToken: string): string {
  return createHash("sha256").update(rawToken.trim()).digest("hex");
}

export interface CreateUnsubscribeTokenInput {
  contactId: string;
  organizationId: string;
  sendId?: string | null;
  /** Defaults to no expiry (tokens are single-use via `used_at`). */
  expiresAt?: string | null;
}

/**
 * Creates a per-recipient unsubscribe token. The table has no client RLS
 * policies (service-role / RPC only), so this always uses the admin client
 * regardless of caller context.
 */
export async function createUnsubscribeToken(
  input: CreateUnsubscribeTokenInput,
): Promise<{ ok: true; rawToken: string } | { ok: false; error: string }> {
  const rawToken = createRawUnsubscribeToken();
  const tokenHash = hashUnsubscribeToken(rawToken);

  const admin = createAdminClient();
  const { error } = await admin.from("newsletter_unsubscribe_tokens").insert({
    organization_id: input.organizationId,
    contact_id: input.contactId,
    token_hash: tokenHash,
    send_id: input.sendId ?? null,
    expires_at: input.expiresAt ?? null,
  });

  if (error) {
    return { ok: false, error: error.message };
  }
  return { ok: true, rawToken };
}

function appUrlBase(): string {
  return (process.env.NEXT_PUBLIC_APP_URL?.trim() || "http://localhost:3000").replace(
    /\/$/,
    "",
  );
}

export function buildUnsubscribeUrl(rawToken: string): string {
  return `${appUrlBase()}/newsletter/unsubscribe?token=${encodeURIComponent(rawToken)}`;
}

export type RedeemUnsubscribeTokenOutcome =
  | "unsubscribed"
  | "already_unsubscribed"
  | "expired"
  | "invalid";

export interface RedeemUnsubscribeTokenResult {
  outcome: RedeemUnsubscribeTokenOutcome;
  organizationName: string | null;
  contactEmail: string | null;
}

/** Redeems a raw unsubscribe token via the SECURITY DEFINER RPC (public, no login). */
export async function redeemUnsubscribeToken(
  rawToken: string,
): Promise<RedeemUnsubscribeTokenResult> {
  const trimmed = rawToken.trim();
  if (!trimmed) {
    return { outcome: "invalid", organizationName: null, contactEmail: null };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("redeem_newsletter_unsubscribe_token", {
    p_token_hash: hashUnsubscribeToken(trimmed),
  });

  if (error) {
    console.error("Failed to redeem newsletter unsubscribe token:", error.message);
    return { outcome: "invalid", organizationName: null, contactEmail: null };
  }

  const rows = Array.isArray(data) ? data : data ? [data] : [];
  const row = rows[0] as
    | { outcome: RedeemUnsubscribeTokenOutcome; organization_name: string | null; contact_email: string | null }
    | undefined;

  if (!row) {
    return { outcome: "invalid", organizationName: null, contactEmail: null };
  }

  return {
    outcome: row.outcome,
    organizationName: row.organization_name,
    contactEmail: row.contact_email,
  };
}
