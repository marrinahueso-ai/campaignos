import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

function readSrc(relativeFromTest: string): string {
  return readFileSync(new URL(relativeFromTest, import.meta.url), "utf8");
}

describe("dashboard chrome is gated until an active organization exists", () => {
  const layout = readSrc("../../../app/(dashboard)/layout.tsx");
  const shell = readSrc("../../../components/layout/DashboardShell.tsx");
  const header = readSrc("../../../components/layout/DashboardHeader.tsx");
  const welcome = readSrc(
    "../../../components/onboarding/OnboardingWelcome.tsx",
  );

  it("layout turns off app chrome when there is no active organization", () => {
    assert.match(layout, /showAppChrome = Boolean\(activeOrganizationId\)/);
    assert.match(layout, /showAppChrome=\{showAppChrome\}/);
    assert.match(
      layout,
      /Sidebar-only work — skip until the user has a workspace/,
    );
  });

  it("shell omits sidebar, mobile rail, and header until chrome is on", () => {
    assert.match(shell, /showAppChrome\?: boolean/);
    assert.match(shell, /\{showAppChrome \? \(/);
    assert.match(shell, /showAppChrome \? \(\s*<DashboardHeader/);
    assert.match(header, /aria-label="Open navigation"/);
    assert.match(header, /label="Home"/);
    assert.match(header, /HeaderAskRalliButton/);
    assert.match(header, /label="Settings"/);
  });

  it("New School Handoff fills the viewport without compensating for the header", () => {
    assert.match(welcome, /data-onboarding-ease="bootstrap"/);
    assert.match(welcome, /min-h-dvh/);
    assert.doesNotMatch(welcome, /calc\(100vh-4rem\)/);
    assert.doesNotMatch(welcome, /-my-8/);
  });
});
