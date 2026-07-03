import type { NextRequest } from "next/server";
import {
  getPendingFoundingAccessCodeFromRequest,
  PENDING_FOUNDING_ACCESS_QUERY_PARAM,
  validateFoundingAccessCode,
} from "@/lib/auth/founding-access";
import { verifyPendingFoundingAccessLinkToken } from "@/lib/auth/founding-access-link-token";

/** Resolve pending founding code from cookie or signed magic-link param. */
export function resolvePendingFoundingAccessForCallback(
  request: NextRequest,
  email: string,
): string | null {
  const fromCookie = getPendingFoundingAccessCodeFromRequest(request);
  if (fromCookie && validateFoundingAccessCode(fromCookie)) {
    return fromCookie;
  }

  const token = request.nextUrl.searchParams
    .get(PENDING_FOUNDING_ACCESS_QUERY_PARAM)
    ?.trim();
  if (!token) {
    return null;
  }

  return verifyPendingFoundingAccessLinkToken(token, email);
}
