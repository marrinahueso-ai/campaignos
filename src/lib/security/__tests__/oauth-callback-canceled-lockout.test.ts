import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

/**
 * Security regression guard: the Meta/Google/Canva/Monday OAuth callback
 * routes are intentionally listed in PUBLIC_PATHS (src/lib/supabase/middleware.ts)
 * so the app's canceled-subscription org-gate never runs for them — that gate
 * only covers authenticated app-page navigation. Without an explicit check
 * inside each callback, a member of a canceled org could still complete a
 * brand-new integration connection (Meta Page tokens + inbox webhooks,
 * Google Calendar sync, Canva, Monday) while locked out of every other
 * authenticated route in the app. Each callback must check
 * getOrganizationCanceledLockout() right after resolving the organization,
 * before performing any token-exchange/connection-establishing work, and
 * redirect to BILLING_CANCELED_PATH instead.
 */
const CALLBACK_ROUTES = [
  {
    name: "meta",
    path: "../../../app/api/meta/oauth/callback/route.ts",
    establishingCall: "exchangeCodeForUserToken(",
  },
  {
    name: "google",
    path: "../../../app/api/google/oauth/callback/route.ts",
    establishingCall: "exchangeGoogleAuthorizationCode(",
  },
  {
    name: "canva",
    path: "../../../app/api/canva/oauth/callback/route.ts",
    establishingCall: "exchangeCanvaAuthorizationCode(",
  },
  {
    name: "monday",
    path: "../../../app/api/monday/oauth/callback/route.ts",
    establishingCall: "exchangeMondayAuthorizationCode(",
  },
] as const;

function readSrc(relativePath: string): string {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

describe("OAuth callback routes — canceled-subscription lockout", () => {
  for (const route of CALLBACK_ROUTES) {
    describe(`${route.name} callback`, () => {
      it("imports the canceled-lockout check and BILLING_CANCELED_PATH", () => {
        const src = readSrc(route.path);
        assert.match(
          src,
          /import \{ getOrganizationCanceledLockout \} from "@\/lib\/auth\/organization-access-state";/,
        );
        assert.match(
          src,
          /import \{ BILLING_CANCELED_PATH \} from "@\/lib\/billing\/subscription-lockout";/,
        );
      });

      it("checks canceled lockout after resolving the organization but before the token exchange", () => {
        const src = readSrc(route.path);
        const orgIdx = src.indexOf("getLatestOrganization()");
        const lockoutIdx = src.indexOf("getOrganizationCanceledLockout(");
        const exchangeIdx = src.indexOf(route.establishingCall);

        assert.ok(orgIdx >= 0, "getLatestOrganization() call not found");
        assert.ok(lockoutIdx >= 0, "getOrganizationCanceledLockout() call not found");
        assert.ok(exchangeIdx >= 0, `${route.establishingCall} call not found`);

        assert.ok(
          lockoutIdx > orgIdx,
          "canceled-lockout check must run after the organization is resolved",
        );
        assert.ok(
          exchangeIdx > lockoutIdx,
          "token exchange must not run before the canceled-lockout check",
        );
      });

      it("redirects to BILLING_CANCELED_PATH when the lockout check trips", () => {
        const src = readSrc(route.path);
        const lockoutIdx = src.indexOf("getOrganizationCanceledLockout(");
        const nearby = src.slice(lockoutIdx, lockoutIdx + 300);
        assert.match(nearby, /BILLING_CANCELED_PATH/);
      });
    });
  }
});
