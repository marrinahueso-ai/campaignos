import "server-only";

import { createHmac, timingSafeEqual } from "crypto";

/** Match prior Storage signed-URL window so email CTAs stay usable for a month. */
const DOWNLOAD_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 30;

interface ExecutedDownloadPayload {
  sid: string;
  x: number;
}

function getDownloadSigningSecret(): string {
  const dedicated = process.env.DEVELOPER_AGREEMENT_DOWNLOAD_SECRET?.trim();
  if (dedicated) return dedicated;

  // Never fall back to a public key (NEXT_PUBLIC_* is shipped to the client)
  // or a hardcoded literal — either would let anyone forge admin-bypassing
  // download tokens. The service-role key is at least a private secret; if
  // even that is missing, refuse to sign rather than mint a forgeable token.
  const serviceRoleFallback = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (serviceRoleFallback) {
    console.error(
      "[developer-agreements] DEVELOPER_AGREEMENT_DOWNLOAD_SECRET is not set; " +
        "falling back to SUPABASE_SERVICE_ROLE_KEY. Set a dedicated secret.",
    );
    return serviceRoleFallback;
  }

  throw new Error(
    "DEVELOPER_AGREEMENT_DOWNLOAD_SECRET is not configured. Add it to the environment before issuing or verifying agreement download tokens.",
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

export function createExecutedAgreementDownloadToken(signatureId: string): string {
  const payload: ExecutedDownloadPayload = {
    sid: signatureId,
    x: Date.now() + DOWNLOAD_TOKEN_TTL_SECONDS * 1000,
  };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = createHmac("sha256", getDownloadSigningSecret())
    .update(body)
    .digest("base64url");
  return `${body}.${signature}`;
}

export function verifyExecutedAgreementDownloadToken(
  token: string,
  signatureId: string,
): boolean {
  const [body, signature] = token.split(".");
  if (!body || !signature) {
    return false;
  }

  const expectedSignature = createHmac("sha256", getDownloadSigningSecret())
    .update(body)
    .digest("base64url");
  if (!safeEqualStrings(signature, expectedSignature)) {
    return false;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(body, "base64url").toString("utf8"),
    ) as ExecutedDownloadPayload;
    if (payload.sid !== signatureId) {
      return false;
    }
    if (typeof payload.x !== "number" || payload.x < Date.now()) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}
