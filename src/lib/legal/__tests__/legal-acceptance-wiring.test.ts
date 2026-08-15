import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { CURRENT_TERMS_VERSION } from "../versions.ts";

function readRepo(relativeFromTest: string): string {
  return readFileSync(new URL(relativeFromTest, import.meta.url), "utf8");
}

describe("legal acceptance wiring", () => {
  const middleware = readRepo("../../supabase/middleware.ts");
  const termsPage = readRepo("../../../app/terms/page.tsx");
  const privacyPage = readRepo("../../../app/privacy/page.tsx");
  const signupForm = readRepo("../../../components/marketing-wow/MarketingWowSignupForm.tsx");
  const inviteForm = readRepo("../../../components/marketing-wow/MarketingWowInviteForm.tsx");
  const legalNote = readRepo("../../../components/marketing-wow/MarketingAuthCardShell.tsx");
  const authActions = readRepo("../../auth/actions.ts");
  const callback = readRepo("../../../app/auth/callback/route.ts");
  const legalActions = readRepo("../actions.ts");
  const acceptances = readRepo("../acceptances.ts");
  const migration = readRepo(
    "../../../../supabase/migrations/20260814190000_legal_acceptances.sql",
  );
  const gatePage = readRepo("../../../app/account/legal/page.tsx");
  const gateClient = readRepo("../../../components/legal/LegalAcceptanceGate.tsx");
  const postAuth = readRepo("../../auth/post-auth-path-for-user.ts");
  const billingActions = readRepo("../../billing/actions.ts");
  const legalContent = readRepo("../../marketing-wow/legal-content.tsx");

  it("keeps /terms and /privacy public", () => {
    assert.match(middleware, /"\/terms"/);
    assert.match(middleware, /"\/privacy"/);
    assert.match(termsPage, /TermsOfServiceContent/);
    assert.doesNotMatch(termsPage, /getAuthUser|getActiveMembership|redirect\(/);
    assert.match(privacyPage, /PrivacyPolicyContent/);
    assert.doesNotMatch(privacyPage, /getAuthUser|getActiveMembership|redirect\(/);
  });

  it("signup and invite flows link both Terms and Privacy", () => {
    assert.match(signupForm, /MarketingAuthLegalNote/);
    assert.match(inviteForm, /MarketingAuthLegalNote/);
    assert.match(legalNote, /By continuing, you agree to the Hey Ralli/);
    assert.match(legalNote, /href="\/terms"/);
    assert.match(legalNote, /href="\/privacy"/);
    assert.match(legalNote, /Terms of Service/);
    assert.match(legalNote, /Privacy Policy/);
    assert.doesNotMatch(inviteForm, /By joining, you agree to the Hey Ralli/);
  });

  it("records invite and signup acceptance from authenticated server identity", () => {
    assert.match(authActions, /recordCurrentLegalAcceptance/);
    assert.match(authActions, /source: "invite"/);
    assert.match(callback, /source: invite \? "invite" : "signup"/);
    assert.match(callback, /sessionUserId: user\.id/);
    assert.match(authActions, /sessionUserId: data\.user\.id/);
  });

  it("gate action never trusts a browser-supplied user id", () => {
    assert.match(legalActions, /formData\.get\("user_id"\)/);
    assert.match(legalActions, /requestedUserId: spoofedUserId/);
    assert.match(legalActions, /sessionUserId: user\.id/);
    assert.match(legalActions, /source: "reaccept_gate"/);
    assert.match(acceptances, /createAdminClient/);
    assert.match(acceptances, /buildLegalAcceptanceInserts/);
  });

  it("uses an append-only legal_acceptances table with RLS select-own and no client writes", () => {
    assert.match(migration, /create table if not exists public\.legal_acceptances/);
    assert.match(migration, /unique \(user_id, document_type, version\)/);
    assert.match(migration, /legal_acceptances_select_own/);
    assert.match(migration, /user_id = auth\.uid\(\)/);
    assert.match(migration, /revoke insert, update, delete on public\.legal_acceptances/);
    assert.doesNotMatch(migration, /developer_agreement_signatures/);
  });

  it("gates existing users without the current Terms version and skips the gate after accept", () => {
    assert.match(middleware, /userMustAcceptCurrentTerms/);
    assert.match(middleware, /LEGAL_ACCEPTANCE_PATH/);
    assert.match(postAuth, /userMustAcceptCurrentTerms/);
    assert.match(gatePage, /userMustAcceptCurrentTerms/);
    assert.match(gatePage, /getAuthenticatedAppPath/);
    assert.match(gateClient, /Updated Terms of Service/);
    assert.match(gateClient, /Accept & Continue/);
    assert.match(gateClient, /Review Terms/);
    assert.match(gateClient, /href="\/privacy"/);
    assert.match(gateClient, /href="\/terms"/);
    assert.doesNotMatch(gateClient, /checked/);
  });

  it("checks Terms acceptance before developer agreements and the org gate", () => {
    const termsIndex = middleware.indexOf("mustAcceptTermsResult.ok && mustAcceptTermsResult.value");
    const agreementsIndex = middleware.indexOf("mustSignResult.ok && mustSignResult.value");
    const orgIndex = middleware.indexOf("gateRedirectResult.ok && gateRedirectResult.value");
    assert.ok(termsIndex >= 0);
    assert.ok(agreementsIndex >= 0);
    assert.ok(orgIndex >= 0);
    assert.ok(termsIndex < agreementsIndex);
    assert.ok(agreementsIndex < orgIndex);
  });

  it("does not treat login or password recovery as Terms acceptance", () => {
    assert.match(middleware, /!pathname.startsWith\(LEGAL_ACCEPTANCE_PATH\)/);
    assert.match(callback, /const isRecovery = otpType === "recovery"/);
    assert.match(callback, /if \(!isRecovery && \(invite \|\| setupIntent\)\)/);
    const passwordLogin = authActions.slice(
      authActions.indexOf("export async function signInWithPasswordAction"),
      authActions.indexOf("export async function completeInviteSetupAction"),
    );
    assert.match(passwordLogin, /if \(inviteToken && data\.user\)/);
    assert.doesNotMatch(passwordLogin, /source: "signup"/);
    assert.doesNotMatch(passwordLogin, /source: "reaccept_gate"/);
  });

  it("publishes the current Terms version and required commercial clauses", () => {
    assert.match(legalContent, /Hey Ralli, LLC/);
    assert.match(legalContent, /Effective Date: August 14, 2026/);
    assert.match(legalContent, /Last Updated: August 14, 2026/);
    assert.match(legalContent, /\$5,000/);
    assert.match(legalContent, /State of Tennessee/);
    assert.match(legalContent, /6688 Nolensville Rd/);
    assert.match(legalContent, /inspiration or reference/);
    assert.match(legalContent, /Communication Hub/);
    assert.match(legalContent, /https:\/\/heyralli\.com\/privacy#user-data-deletion/);
    assert.match(legalContent, /CURRENT_TERMS_VERSION/);
    assert.equal(CURRENT_TERMS_VERSION, "2026-08-14");
  });

  it("configures Stripe Checkout Terms consent without changing plan prices", () => {
    assert.match(billingActions, /consent_collection/);
    assert.match(billingActions, /terms_of_service: "required"/);
    assert.doesNotMatch(billingActions, /priceUsd/);
  });
});
