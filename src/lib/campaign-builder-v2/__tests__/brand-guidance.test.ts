import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildBrandGuidanceBlock } from "../brand-guidance.ts";
import {
  hasOrganizationBrandDirection,
  isNoBrandKit,
  NO_BRAND_KIT_ID,
  ORG_DEFAULT_BRAND_KIT_ID,
  resolveBrandKitIdForSession,
} from "../brand-kit.ts";

describe("buildBrandGuidanceBlock", () => {
  it("includes brand_assets primary/accent colors, mascot, and logo refs", () => {
    const guidance = buildBrandGuidanceBlock({
      items: [],
      primaryColor: "#0F766E",
      secondaryColor: "#22C55E",
      mascot: "Globe",
      hasPtoLogo: true,
      hasSchoolLogo: false,
    });

    assert.ok(guidance);
    assert.match(guidance!, /Color — Primary: #0F766E/);
    assert.match(guidance!, /Color — Accent: #22C55E/);
    assert.match(guidance!, /Mascot: Globe/);
    assert.match(guidance!, /PTO logo: attached as a visual brand reference/);
  });

  it("dedupes colors already present on brand kit items", () => {
    const guidance = buildBrandGuidanceBlock({
      items: [
        {
          category: "color",
          label: "Primary",
          valueText: "#0F766E",
        },
      ],
      primaryColor: "#0F766E",
      secondaryColor: "#22C55E",
    });

    assert.ok(guidance);
    assert.equal(
      (guidance!.match(/Color — /g) ?? []).length,
      2,
      "primary once + accent once",
    );
    assert.match(guidance!, /Color — Primary: #0F766E/);
    assert.match(guidance!, /Color — Accent: #22C55E/);
  });

  it("returns null when there is no brand direction", () => {
    assert.equal(buildBrandGuidanceBlock({ items: [] }), null);
  });
});

describe("brand kit session defaults", () => {
  it("detects organization brand direction from assets or mascot", () => {
    assert.equal(
      hasOrganizationBrandDirection({ mascot: "Globe" }),
      true,
    );
    assert.equal(
      hasOrganizationBrandDirection({ primaryColor: "#0F766E" }),
      true,
    );
    assert.equal(hasOrganizationBrandDirection({}), false);
  });

  it("does not auto-apply org brand kit even when brand exists", () => {
    assert.equal(isNoBrandKit(NO_BRAND_KIT_ID), true);
    assert.equal(
      resolveBrandKitIdForSession(NO_BRAND_KIT_ID, true),
      NO_BRAND_KIT_ID,
    );
    assert.equal(
      resolveBrandKitIdForSession(NO_BRAND_KIT_ID, false),
      NO_BRAND_KIT_ID,
    );
    assert.equal(
      resolveBrandKitIdForSession(ORG_DEFAULT_BRAND_KIT_ID, true),
      NO_BRAND_KIT_ID,
    );
  });
});
