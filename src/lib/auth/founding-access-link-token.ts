import "server-only";

import { createHmac, timingSafeEqual } from "crypto";
import { validateFoundingAccessCode } from "@/lib/auth/founding-access";

const PENDING_CODE_MAX_AGE_SECONDS = 60 * 60 * 24;

interface PendingFoundingAccessLinkPayload {
  e: string;
  c: string;
  x: number;
}

function getFacSigningSecret(): string {
  return (
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
    "campaignos-dev-fac-secret"
  );
}

function safeEqualStrings(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    return false;
  }
  return timingSafeEqual(bufA, bufB);
}

export function createPendingFoundingAccessLinkToken(
  email: string,
  code: string,
): string {
  const payload: PendingFoundingAccessLinkPayload = {
    e: email.trim().toLowerCase(),
    c: code.trim().toUpperCase(),
    x: Date.now() + PENDING_CODE_MAX_AGE_SECONDS * 1000,
  };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = createHmac("sha256", getFacSigningSecret())
    .update(body)
    .digest("base64url");
  return `${body}.${signature}`;
}

export function verifyPendingFoundingAccessLinkToken(
  token: string,
  email: string,
): string | null {
  const [body, signature] = token.split(".");
  if (!body || !signature) {
    return null;
  }

  const expectedSignature = createHmac("sha256", getFacSigningSecret())
    .update(body)
    .digest("base64url");
  if (!safeEqualStrings(signature, expectedSignature)) {
    return null;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(body, "base64url").toString("utf8"),
    ) as PendingFoundingAccessLinkPayload;

    if (payload.e !== email.trim().toLowerCase()) {
      return null;
    }

    if (payload.x < Date.now()) {
      return null;
    }

    if (!validateFoundingAccessCode(payload.c)) {
      return null;
    }

    return payload.c.trim().toUpperCase();
  } catch {
    return null;
  }
}
