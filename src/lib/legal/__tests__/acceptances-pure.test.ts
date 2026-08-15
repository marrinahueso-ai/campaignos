import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildLegalAcceptanceInserts,
  hasAcceptedTermsVersion,
  isLegalAcceptancePath,
  safePostAcceptancePath,
  termsAcceptanceRedirectPath,
  userMustAcceptCurrentTermsFromRows,
} from "../acceptances-pure.ts";
import {
  CURRENT_PRIVACY_VERSION,
  CURRENT_TERMS_VERSION,
  LEGAL_ACCEPTANCE_PATH,
} from "../versions.ts";

describe("legal acceptance versioning", () => {
  it("uses a stable Terms version identifier distinct from display copy", () => {
    assert.equal(CURRENT_TERMS_VERSION, "2026-08-14");
    assert.equal(CURRENT_PRIVACY_VERSION, "2026-08-14");
    assert.equal(LEGAL_ACCEPTANCE_PATH, "/account/legal");
  });

  it("gates users with no acceptance record", () => {
    assert.equal(userMustAcceptCurrentTermsFromRows([]), true);
    assert.equal(hasAcceptedTermsVersion(null), false);
  });

  it("does not gate users who accepted the current version", () => {
    assert.equal(
      userMustAcceptCurrentTermsFromRows([CURRENT_TERMS_VERSION]),
      false,
    );
    assert.equal(hasAcceptedTermsVersion(CURRENT_TERMS_VERSION), true);
  });

  it("gates users who only accepted an older version", () => {
    assert.equal(
      userMustAcceptCurrentTermsFromRows(["2026-07-26"]),
      true,
    );
    assert.equal(
      userMustAcceptCurrentTermsFromRows(["2026-07-26", CURRENT_TERMS_VERSION]),
      false,
    );
  });

  it("preserves history: old versions still count as records but do not satisfy a new current version", () => {
    const history = ["2026-07-26", "2026-08-01"];
    assert.equal(
      userMustAcceptCurrentTermsFromRows(history, "2026-08-14"),
      true,
    );
    assert.equal(history.includes("2026-07-26"), true);
    assert.equal(
      userMustAcceptCurrentTermsFromRows(
        [...history, "2026-08-14"],
        "2026-08-14",
      ),
      false,
    );
  });

  it("binds inserts to the session user and ignores a spoofed user id", () => {
    const rows = buildLegalAcceptanceInserts({
      sessionUserId: "session-user",
      requestedUserId: "attacker-user",
      source: "reaccept_gate",
    });
    assert.equal(rows.length, 2);
    assert.ok(rows.every((row) => row.user_id === "session-user"));
    assert.ok(rows.every((row) => row.user_id !== "attacker-user"));
    assert.deepEqual(
      rows.map((row) => row.document_type).sort(),
      ["privacy", "terms"],
    );
    assert.equal(
      rows.find((row) => row.document_type === "terms")?.version,
      CURRENT_TERMS_VERSION,
    );
    assert.equal(
      rows.find((row) => row.document_type === "privacy")?.version,
      CURRENT_PRIVACY_VERSION,
    );
  });

  it("does not insert when the session user id is missing", () => {
    assert.deepEqual(
      buildLegalAcceptanceInserts({
        sessionUserId: "  ",
        requestedUserId: "anyone",
        source: "signup",
      }),
      [],
    );
  });

  it("avoids redirect loops back onto the acceptance gate", () => {
    assert.equal(isLegalAcceptancePath(LEGAL_ACCEPTANCE_PATH), true);
    assert.equal(safePostAcceptancePath(LEGAL_ACCEPTANCE_PATH), null);
    assert.equal(safePostAcceptancePath("/dashboard"), "/dashboard");
    assert.equal(
      termsAcceptanceRedirectPath("/dashboard"),
      `${LEGAL_ACCEPTANCE_PATH}?next=${encodeURIComponent("/dashboard")}`,
    );
    assert.equal(termsAcceptanceRedirectPath(LEGAL_ACCEPTANCE_PATH), LEGAL_ACCEPTANCE_PATH);
  });
});
