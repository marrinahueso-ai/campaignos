import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildOrganizationWelcomeEmail,
  buildSupabaseMagicLinkEmailHtml,
  organizationWelcomeEmailSubject,
} from "../organization-welcome-email.ts";

describe("organization-welcome-email", () => {
  it("uses organization language — not school or PTO", () => {
    const email = buildOrganizationWelcomeEmail({
      actionUrl: "https://heyralli.com/auth/callback",
      email: "founder@example.com",
    });
    const blob = `${email.subject}\n${email.html}\n${email.text}`.toLowerCase();
    assert.match(blob, /organization/);
    assert.match(blob, /welcome to hey ralli/);
    assert.doesNotMatch(blob, /\bschool\b/);
    assert.doesNotMatch(blob, /\bpto\b/);
  });

  it("embeds supabase magic-link placeholders", () => {
    const html = buildSupabaseMagicLinkEmailHtml();
    assert.match(html, /\{\{\s*\.ConfirmationURL\s*\}\}/);
    assert.match(html, /\{\{\s*\.Email\s*\}\}/);
    assert.equal(
      organizationWelcomeEmailSubject(),
      "Welcome to Hey Ralli — create your organization",
    );
  });
});
