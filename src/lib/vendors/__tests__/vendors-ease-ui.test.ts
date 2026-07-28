import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  resolveVendorContact,
  vendorCardBandTone,
  vendorStatusPill,
  vendorWebsiteHref,
} from "../contact.ts";
import type { Vendor, VendorContact } from "../../../types/vendors.ts";

function readSrc(relativeFromTest: string): string {
  return readFileSync(new URL(relativeFromTest, import.meta.url), "utf8");
}

function makeVendor(overrides: Partial<Vendor> = {}): Vendor {
  return {
    id: "v1",
    organizationId: "org",
    name: "Jumping Castle Co.",
    website: "https://jumpcastle.example",
    email: "office@jumpcastle.example",
    phone: "+16155550101",
    addressLine1: null,
    addressLine2: null,
    city: "Nashville",
    state: null,
    postalCode: null,
    categoryId: null,
    status: "active",
    isFavorite: false,
    notesSummary: null,
    logoPath: null,
    deletedAt: null,
    createdAt: "",
    updatedAt: "",
    ...overrides,
  };
}

function makeContact(overrides: Partial<VendorContact> = {}): VendorContact {
  return {
    id: "c1",
    organizationId: "org",
    vendorId: "v1",
    name: "Maya Chen",
    title: "Owner",
    email: "maya@jumpcastle.example",
    phone: "+16155550101",
    isPrimary: true,
    createdAt: "",
    ...overrides,
  };
}

describe("vendors ease contact helpers", () => {
  it("prefers primary contact phone/email and builds who/lead labels", () => {
    const contact = resolveVendorContact(makeVendor(), makeContact());
    assert.equal(contact.email, "maya@jumpcastle.example");
    assert.equal(contact.phone, "+16155550101");
    assert.equal(contact.whoLabel, "Maya Chen · Owner");
    assert.equal(contact.leadLabel, "Maya Chen · Owner · Nashville");
    assert.equal(contact.callLabel, "Call Maya");
    assert.equal(contact.websiteLabel, "jumpcastle.example");
  });

  it("falls back to vendor phone/email when contact lacks them", () => {
    const contact = resolveVendorContact(
      makeVendor({ phone: "615-555-0199", email: "hello@example.com" }),
      makeContact({ phone: null, email: null }),
    );
    assert.equal(contact.phone, "615-555-0199");
    assert.equal(contact.email, "hello@example.com");
  });

  it("normalizes website hrefs", () => {
    assert.equal(vendorWebsiteHref("jumpcastle.example"), "https://jumpcastle.example");
    assert.equal(
      vendorWebsiteHref("https://jumpcastle.example/"),
      "https://jumpcastle.example/",
    );
    assert.equal(vendorWebsiteHref(null), null);
  });

  it("maps status pills and band tones", () => {
    assert.deepEqual(vendorStatusPill("active"), { label: "Active", tone: "ok" });
    assert.deepEqual(vendorStatusPill("pending"), {
      label: "Pending",
      tone: "warn",
    });
    assert.equal(vendorCardBandTone("abc", "teal"), "teal");
    assert.ok(["forest", "mustard", "teal"].includes(vendorCardBandTone("xyz")));
  });
});

describe("vendors ease UI contracts", () => {
  const directory = readSrc(
    "../../../components/vendors/VendorDirectoryShell.tsx",
  );
  const card = readSrc("../../../components/vendors/VendorCard.tsx");
  const logoMark = readSrc("../../../components/vendors/VendorLogoMark.tsx");
  const profile = readSrc("../../../components/vendors/VendorProfileShell.tsx");
  const eventPanel = readSrc(
    "../../../components/events-phase3/EventDetailVendorsEasePanel.tsx",
  );
  const page = readSrc("../../../app/(dashboard)/vendors/page.tsx");
  const actions = readSrc(
    "../../../components/vendors/VendorContactActions.tsx",
  );
  const contactLib = readSrc("../contact.ts");
  const vendorActions = readSrc("../actions.ts");

  it("wires /vendors to Ease directory shell without KPI summary cards", () => {
    assert.match(page, /VendorDirectoryShell/);
    assert.doesNotMatch(page, /VendorDirectorySummaryCards/);
    assert.doesNotMatch(page, /getVendorsDirectoryLayoutForCurrentUser/);
    assert.doesNotMatch(directory, /VendorDirectorySummaryCards/);
  });

  it("uses quiet search + All / Favorites / Past / Blocked tabs", () => {
    assert.match(directory, /Search name, phone, email/);
    assert.match(directory, /history\.replaceState/);
    assert.match(directory, /VENDOR_DIRECTORY_TABS/);
    assert.match(directory, /Vendor directory tabs/);
    assert.match(directory, /Add vendor/);
    // Mockup btn-primary: ink pill, not secondary/outline Button chrome.
    assert.match(directory, /bg-\[#2a2622\].*text-\[#fffcf7\]|bg-\[#2a2622\][\s\S]*text-\[#fffcf7\]/);
    assert.doesNotMatch(directory, /from \"@\/components\/ui\/Button\"/);
    assert.doesNotMatch(directory, /Filter by category/);
    assert.doesNotMatch(directory, /All Statuses/);
    assert.doesNotMatch(directory, /VendorDirectorySummaryCards/);
  });

  it("puts Call / Email / Website one-tap actions on directory cards", () => {
    assert.match(card, /VendorContactActions/);
    assert.match(card, /View profile/);
    assert.match(card, /resolveVendorContact/);
    assert.match(actions, /tel:/);
    assert.match(actions, /mailto:/);
  });

  it("keeps Ease header bands plus a squircle logo slot on the band", () => {
    assert.match(card, /BAND_STYLE/);
    assert.match(card, /h-\[72px\]/);
    assert.match(card, /style=\{BAND_STYLE\[bandTone\]\}/);
    assert.match(card, /#2f4a3c/);
    assert.match(card, /#c4922e/);
    assert.match(card, /#2a7a86/);
    assert.match(card, /VendorLogoMark/);
    assert.match(card, /size=\"card\"/);
    assert.match(card, /vendorCardBandTone/);
    assert.match(logoMark, /rounded-\[14px\]/);
    assert.match(logoMark, /object-cover/);
    assert.match(card, /bandTone=\{bandTone\}/);
    assert.match(logoMark, /VENDOR_LOGO_MARK_TONE/);
    assert.match(contactLib, /#4d6b58/);
    assert.match(logoMark, /uploadVendorLogoAction/);
    assert.match(logoMark, /clearVendorLogoAction/);
    assert.match(logoMark, /previewObjectUrlRef/);
    assert.match(logoMark, /URL\.revokeObjectURL/);
    // Logo shell is squircle; X control may still use rounded-full.
    assert.doesNotMatch(logoMark, /h-12 w-12[^\n]*rounded-full|rounded-full[^\n]*h-12 w-12/);
    // Tailwind v4 maps layered bg-[gradient,#hex] to invalid background-color.
    assert.doesNotMatch(
      card,
      /bg-\[linear-gradient\(135deg.*?\)\s*,\s*#/,
    );
  });

  it("shows contact + Profile on the event Vendors tab with in-tab link/unlink", () => {
    assert.match(eventPanel, /VendorContactActions/);
    assert.match(eventPanel, />\s*Profile\s*</);
    assert.match(eventPanel, /Who’s working this event/);
    assert.match(eventPanel, /Add existing/);
    assert.match(eventPanel, /Add new/);
    assert.match(eventPanel, /Unlink/);
    assert.match(eventPanel, /assignVendorToEventAction/);
    assert.match(eventPanel, /removeVendorFromEventAction/);
    assert.match(eventPanel, /VendorAddModal/);
    assert.match(eventPanel, /loadEventVendorDirectoryAction/);
    assert.match(eventPanel, /defaultEventId=\{eventId\}/);
    assert.match(eventPanel, /window\.confirm/);
    // Browse directory must not use event-scoped linked-only filter.
    assert.match(eventPanel, /directoryHref = "\/vendors"/);
    assert.doesNotMatch(eventPanel, /EaseRow/);
  });

  it("uses a contact-first Ease profile hero with fillable squircle logo", () => {
    assert.match(profile, /VendorHeroContactActions/);
    assert.match(profile, /VendorLogoMark/);
    assert.match(profile, /size=\"hero\"/);
    assert.match(profile, /data\.logoUrl/);
    assert.match(profile, /Back to directory/);
    assert.match(profile, /Favorite/);
    assert.match(profile, /Overview/);
    assert.match(profile, /Documents/);
    assert.match(logoMark, /rounded-\[20px\]/);
    assert.match(logoMark, /Remove .* logo/);
    assert.match(vendorActions, /clearVendorLogoAction/);
  });
});
