import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

function readRepo(relativeFromTest: string): string {
  return readFileSync(new URL(relativeFromTest, import.meta.url), "utf8");
}

describe("marketing nav on small screens", () => {
  const header = readRepo("../../../components/marketing-wow/MarketingWowHeader.tsx");
  const footer = readRepo("../../../components/marketing-wow/MarketingWowFooter.tsx");
  const tour = readRepo("../../../components/marketing-wow/MarketingProductTour.tsx");
  const navLinks = readRepo("../../../components/marketing-wow/nav-links.ts");

  it("keeps Resources in the shared marketing nav", () => {
    assert.match(navLinks, /href: "\/resources"/);
    assert.match(navLinks, /label: "Resources"/);
  });

  it("exposes a mobile menu so Resources is reachable without the desktop nav", () => {
    assert.match(header, /hidden items-center[\s\S]*md:flex/);
    assert.match(header, /Open menu/);
    assert.match(header, /md:hidden/);
    assert.match(header, /MARKETING_WOW_NAV_LINKS/);
  });

  it("lists Resources in the marketing footer", () => {
    assert.match(footer, /href="\/resources"/);
    assert.match(footer, />\s*Resources\s*</);
  });

  it("lets mobile visitors pick homepage Product Tour videos from chips", () => {
    assert.match(tour, /aria-label="Product tour videos"/);
    assert.match(tour, /lg:hidden/);
    assert.match(tour, /hidden gap-0 lg:order-1 lg:grid/);
  });
});
