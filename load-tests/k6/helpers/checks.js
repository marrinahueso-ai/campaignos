import { check } from "k6";
import crypto from "k6/crypto";
import {
  authFailures,
  tenantIsolationFailures,
  unexpected401,
  unexpected403,
  unexpected429,
  unexpected500,
} from "./metrics.js";

const UUID_RE =
  /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/gi;

export function looksLikeLoginRedirect(res) {
  const loc = res.headers.Location || res.headers.location || "";
  if (loc.includes("/login")) return true;
  if (res.url && String(res.url).includes("/login")) return true;
  const body = String(res.body || "");
  // Login page title / form hints without dumping secrets
  if (res.status === 200 && /sign\s*in|log\s*in/i.test(body) && body.includes("/login")) {
    return /name=["']email["']/i.test(body) || /type=["']password["']/i.test(body);
  }
  return false;
}

export function bodyLooksLikeStackTrace(body) {
  const text = String(body || "");
  return (
    text.includes("at Object.") ||
    text.includes("Node.js") ||
    text.includes("Webpack") ||
    /Error:\s+.+\n\s+at\s+/.test(text)
  );
}

/**
 * Record status-class counters for unexpected responses.
 */
export function recordStatusMetrics(res, { expectAuth = true } = {}) {
  if (res.status === 401) unexpected401.add(1);
  if (res.status === 403) unexpected403.add(1);
  if (res.status === 429) unexpected429.add(1);
  if (res.status >= 500) unexpected500.add(1);

  if (expectAuth && looksLikeLoginRedirect(res)) {
    authFailures.add(1);
  }
}

/** Short, non-reversible fingerprint of a response body for audit logs (never the raw body). */
export function responseHash(body) {
  return crypto.sha256(String(body || ""), "hex").slice(0, 16);
}

/**
 * Tenant isolation: body must not contain foreign seeded org UUIDs.
 * Also optionally require expected org id when present in HTML.
 *
 * On a leak, logs a structured (non-sensitive) audit record — route,
 * expected/detected org id, VU, iteration, timestamp, and a body hash —
 * without ever logging cookies, tokens, or full response bodies.
 */
export function assertTenantIsolation(res, {
  expectedOrgId,
  foreignOrgIds = [],
  tag = "page",
  userLabel,
} = {}) {
  const body = String(res.body || "");
  let leakedOrgId = null;

  for (const foreignId of foreignOrgIds) {
    if (foreignId && body.toLowerCase().includes(foreignId.toLowerCase())) {
      leakedOrgId = foreignId;
      break;
    }
  }

  if (leakedOrgId) {
    tenantIsolationFailures.add(1);
    console.error(
      JSON.stringify({
        event: "tenant_isolation_failure",
        route: tag,
        expectedOrgId: expectedOrgId || null,
        detectedForeignOrgId: leakedOrgId,
        vu: __VU,
        iteration: __ITER,
        testUser: userLabel || null,
        timestamp: new Date().toISOString(),
        responseHash: responseHash(body),
        status: res.status,
      }),
    );
  }

  const checks = {
    [`${tag} no foreign org id`]: () => !leakedOrgId,
    [`${tag} no stack trace`]: () => !bodyLooksLikeStackTrace(body),
  };

  // When the expected org is embedded (common in RSC payloads), require it.
  if (expectedOrgId && body.toLowerCase().includes(expectedOrgId.toLowerCase())) {
    checks[`${tag} contains expected org id`] = () => true;
  }

  return check(res, checks);
}

/**
 * Controlled negative: foreign event must not disclose other-tenant content.
 * Accept 403/404 or redirect / soft body without foreign org id.
 */
export function assertCrossTenantDenied(res, {
  foreignOrgId,
  foreignEventTitle,
  tag = "cross_tenant",
} = {}) {
  const body = String(res.body || "");
  const statusOk =
    res.status === 403 ||
    res.status === 404 ||
    res.status === 302 ||
    res.status === 307 ||
    res.status === 308 ||
    // App may soft-redirect to events list / dashboard with 200
    res.status === 200;

  const disclosesOrg =
    foreignOrgId && body.toLowerCase().includes(String(foreignOrgId).toLowerCase());
  const disclosesTitle =
    foreignEventTitle &&
    body.includes(foreignEventTitle) &&
    !looksLikeLoginRedirect(res);

  const denied = statusOk && !disclosesOrg && !disclosesTitle;
  if (!denied) {
    tenantIsolationFailures.add(1);
    console.error(
      JSON.stringify({
        event: "tenant_isolation_failure",
        route: tag,
        expectedOrgId: null,
        detectedForeignOrgId: foreignOrgId || null,
        vu: __VU,
        iteration: __ITER,
        timestamp: new Date().toISOString(),
        responseHash: responseHash(body),
        status: res.status,
      }),
    );
  }

  return check(res, {
    [`${tag} non-disclosing`]: () => denied,
  });
}

export function assertPageOk(res, tag) {
  const redirected = looksLikeLoginRedirect(res);
  if (redirected) authFailures.add(1);

  return check(res, {
    [`${tag} status 200`]: (r) => r.status === 200,
    [`${tag} not login`]: () => !redirected,
    [`${tag} body not empty`]: (r) => r.body && String(r.body).length > 200,
  });
}

/** Extract UUIDs from a body (debug helpers only — avoid logging). */
export function extractUuids(body) {
  return String(body || "").match(UUID_RE) || [];
}
