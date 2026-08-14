import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

function readRepo(relativeFromTest: string): string {
  return readFileSync(new URL(relativeFromTest, import.meta.url), "utf8");
}

describe("privacy route Meta user data deletion", () => {
  const middleware = readRepo("../../supabase/middleware.ts");
  const privacyPage = readRepo("../../../app/privacy/page.tsx");
  const legalContent = readRepo("../../marketing-wow/legal-content.tsx");

  it("lists /privacy as a public middleware path (no auth required)", () => {
    assert.match(middleware, /"\/privacy"/);
    assert.match(middleware, /function isPublicPath/);
  });

  it("renders PrivacyPolicyContent on a public page without auth gates", () => {
    assert.match(privacyPage, /PrivacyPolicyContent/);
    assert.doesNotMatch(privacyPage, /getAuthUser|getActiveMembership|redirect\(/);
  });

  it("exposes the Meta User Data Deletion instructions anchor", () => {
    assert.match(legalContent, /id=["']user-data-deletion["']/);
    assert.match(legalContent, /hello@heyralli\.com/);
    assert.match(
      legalContent,
      /User [Dd]ata [Dd]eletion|user data deletion/i,
    );
    assert.match(
      legalContent,
      /Settings\s*→\s*Account|Erase my account|erase your account|Delete \/ erase account/i,
    );
    assert.match(
      legalContent,
      /Facebook|Instagram|Meta/,
    );
    assert.match(
      legalContent,
      /Disconnect|disconnect Meta|Settings\s*→\s*(Facebook|Meta)/i,
    );
  });
});
