import type { NextRequest } from "next/server";
import type { NextResponse } from "next/server";

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
/** Signed query param so magic links work when the httpOnly cookie is missing (e.g. email in-app browser). */
export const PENDING_FOUNDING_ACCESS_QUERY_PARAM = "fac";
const PENDING_CODE_MAX_AGE_SECONDS = 60 * 60 * 24;

export function getPendingFoundingAccessCodeFromRequest(
  request: NextRequest,
): string | null {
  const value = request.cookies
    .get(PENDING_FOUNDING_ACCESS_COOKIE)
    ?.value?.trim();
  return value ? value.toUpperCase() : null;
}

export function pendingFoundingAccessCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: PENDING_CODE_MAX_AGE_SECONDS,
  };
}

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

/**
 * Fixed-width window for the constant-time compare below. This runs in
 * Next.js Edge Middleware (no `node:crypto`/Buffer available there), so we
 * can't hash with `createHash`/`timingSafeEqual`; comparing raw char codes
 * over a fixed window gets the same property without a Node-only API.
 */
const COMPARE_WINDOW = 256;

/** Constant-time string compare: always walks the full window, never exits early. */
function constantTimeStringEqual(a: string, b: string): boolean {
  let mismatch = a.length === b.length ? 0 : 1;
  for (let i = 0; i < COMPARE_WINDOW; i++) {
    const codeA = i < a.length ? a.charCodeAt(i) : 0;
    const codeB = i < b.length ? b.charCodeAt(i) : 0;
    mismatch |= codeA ^ codeB;
  }
  return mismatch === 0;
}

/**
 * Constant-time membership check: compares the candidate against every
 * configured code (no early exit on match) so neither the candidate's
 * length nor which character differs is observable via timing — a plain
 * `Set.has()`/`===` compare on the raw string leaks both.
 */
function constantTimeCodeMatch(codes: Set<string>, candidate: string): boolean {
  let matched = false;
  for (const code of codes) {
    if (constantTimeStringEqual(candidate, code)) {
      matched = true;
    }
  }
  return matched;
}

export function validateFoundingAccessCode(code: string | null | undefined): boolean {
  const normalized = code?.trim().toUpperCase();
  if (!normalized) {
    return false;
  }

  const configuredCodes = parseFoundingAccessCodes();
  return configuredCodes.size > 0 && constantTimeCodeMatch(configuredCodes, normalized);
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

/** Clear pending setup cookie on OAuth/password responses (stale cookie must not block sign-in). */
export function clearPendingFoundingAccessCookieOnResponse(
  response: NextResponse,
): void {
  response.cookies.set(PENDING_FOUNDING_ACCESS_COOKIE, "", {
    ...pendingFoundingAccessCookieOptions(),
    maxAge: 0,
  });
}

export function isOrganizationBillingExempt(organization: {
  billingExemptAt?: string | null;
}): boolean {
  return Boolean(organization.billingExemptAt);
}
