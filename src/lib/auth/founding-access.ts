import { cookies } from "next/headers";

/**
 * Founding / beta access codes are configured via Vercel env vars (not in-app UI):
 *
 * - CAMPAIGNOS_BETA_ACCESS_CODE=MYCODE
 * - CAMPAIGNOS_FOUNDING_ACCESS_CODES=CODE1,CODE2
 * - CAMPAIGNOS_REQUIRE_ACCESS_CODE=true  (default: true; set false for local dev only)
 *
 * New school signup validates the code on /login?intent=setup before account creation.
 * The validated code is stored in an httpOnly cookie until school setup completes.
 */
const TRUTHY = new Set(["1", "true", "yes", "on"]);
const FALSY = new Set(["0", "false", "no", "off"]);

export const PENDING_FOUNDING_ACCESS_COOKIE = "campaignos_pending_founding_access";
const PENDING_CODE_MAX_AGE_SECONDS = 60 * 60 * 24;

function parseFoundingAccessCodes(): Set<string> {
  const codes = new Set<string>();

  const list = process.env.CAMPAIGNOS_FOUNDING_ACCESS_CODES?.trim();
  if (list) {
    for (const entry of list.split(",")) {
      const normalized = entry.trim().toUpperCase();
      if (normalized) {
        codes.add(normalized);
      }
    }
  }

  const single = process.env.CAMPAIGNOS_BETA_ACCESS_CODE?.trim();
  if (single) {
    codes.add(single.toUpperCase());
  }

  return codes;
}

/** Defaults to true unless CAMPAIGNOS_REQUIRE_ACCESS_CODE=false (dev only). */
export function isFoundingAccessCodeRequired(): boolean {
  const value = process.env.CAMPAIGNOS_REQUIRE_ACCESS_CODE?.trim().toLowerCase();
  if (!value) {
    return true;
  }
  if (FALSY.has(value)) {
    return false;
  }
  return TRUTHY.has(value);
}

export function validateFoundingAccessCode(code: string | null | undefined): boolean {
  const normalized = code?.trim().toUpperCase();
  if (!normalized) {
    return false;
  }

  const configuredCodes = parseFoundingAccessCodes();
  return configuredCodes.size > 0 && configuredCodes.has(normalized);
}

export interface FoundingAccessResolution {
  valid: boolean;
  billingExempt: boolean;
  normalizedCode: string | null;
  error: string | null;
}

/** Validate founding access code for signup or school setup. */
export function resolveFoundingAccess(
  code: string | null | undefined,
  options?: { required?: boolean },
): FoundingAccessResolution {
  const normalizedCode = code?.trim().toUpperCase() || null;
  const required = options?.required ?? isFoundingAccessCodeRequired();

  if (!normalizedCode) {
    if (required) {
      return {
        valid: false,
        billingExempt: false,
        normalizedCode: null,
        error: "A founding access code is required to get started.",
      };
    }

    return {
      valid: true,
      billingExempt: false,
      normalizedCode: null,
      error: null,
    };
  }

  if (!validateFoundingAccessCode(normalizedCode)) {
    return {
      valid: false,
      billingExempt: false,
      normalizedCode,
      error: "That access code is not valid. Check the code and try again.",
    };
  }

  return {
    valid: true,
    billingExempt: true,
    normalizedCode,
    error: null,
  };
}

export async function setPendingFoundingAccessCookie(code: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(PENDING_FOUNDING_ACCESS_COOKIE, code.trim().toUpperCase(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: PENDING_CODE_MAX_AGE_SECONDS,
  });
}

export async function getPendingFoundingAccessCode(): Promise<string | null> {
  const cookieStore = await cookies();
  const value = cookieStore.get(PENDING_FOUNDING_ACCESS_COOKIE)?.value?.trim();
  return value ? value.toUpperCase() : null;
}

export async function clearPendingFoundingAccessCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(PENDING_FOUNDING_ACCESS_COOKIE);
}

export async function resolvePendingFoundingAccess(): Promise<FoundingAccessResolution> {
  const pendingCode = await getPendingFoundingAccessCode();
  return resolveFoundingAccess(pendingCode, { required: true });
}

export function isOrganizationBillingExempt(organization: {
  billingExemptAt?: string | null;
}): boolean {
  return Boolean(organization.billingExemptAt);
}
