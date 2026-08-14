import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

const here = dirname(fileURLToPath(import.meta.url));
const actionsSrc = readFileSync(join(here, "../actions.ts"), "utf8");

/**
 * Security contract: rotating a password must invalidate other active
 * sessions/devices. Supabase Auth's updateUser({ password }) alone does not
 * delete peer auth.sessions rows, so both password-change entry points must
 * call revokeUserSessions and then re-establish only the current device.
 */
function extractFunctionBody(name: string): string {
  const start = actionsSrc.indexOf(`export async function ${name}(`);
  assert.ok(start >= 0, `${name} not found`);
  const nextExport = actionsSrc.indexOf("\nexport async function ", start + 10);
  return actionsSrc.slice(start, nextExport >= 0 ? nextExport : undefined);
}

describe("password change — revoke other sessions", () => {
  it("imports revokeUserSessions (full revoke, not membership-gated)", () => {
    assert.match(actionsSrc, /revokeUserSessions,/);
    assert.match(actionsSrc, /from "@\/lib\/auth\/revoke-sessions"/);
  });

  it("changePasswordAction revokes all sessions after updateUser, then re-signs in", () => {
    const body = extractFunctionBody("changePasswordAction");
    const updateIdx = body.indexOf("updateUser({ password })");
    const revokeIdx = body.indexOf("revokeUserSessions(user.id)");
    assert.ok(updateIdx >= 0, "expected updateUser({ password })");
    assert.ok(revokeIdx > updateIdx, "revoke must follow password update");

    // First signInWithPassword is current-password reauth; the second is the
    // post-revoke re-establish on this device with the new password.
    const firstSignIn = body.indexOf("signInWithPassword({");
    const secondSignIn = body.indexOf("signInWithPassword({", firstSignIn + 1);
    assert.ok(firstSignIn >= 0 && firstSignIn < updateIdx, "expected reauth before update");
    assert.ok(secondSignIn > revokeIdx, "expected post-revoke sign-in");
    assert.match(
      body.slice(secondSignIn, secondSignIn + 120),
      /password(?!\s*:\s*currentPassword)/,
    );
  });

  it("updatePasswordFromRecoveryAction also revokes peer sessions after rotation", () => {
    const body = extractFunctionBody("updatePasswordFromRecoveryAction");
    const updateIdx = body.indexOf("updateUser({ password })");
    const revokeIdx = body.indexOf("revokeUserSessions(user.id)");
    assert.ok(updateIdx >= 0);
    assert.ok(revokeIdx > updateIdx);
    assert.match(body, /signInWithPassword\(/);
  });
});
