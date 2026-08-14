import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { toMetaSettingsConnectionView } from "../connection-utils.ts";
import type { MetaConnection } from "../types.ts";

function sampleConnection(
  overrides: Partial<MetaConnection> = {},
): MetaConnection {
  return {
    id: "conn-1",
    organizationId: "org-1",
    facebookPageId: "page-123",
    instagramAccountId: "ig-456",
    pageAccessToken: "SECRET_PAGE_ACCESS_TOKEN_DO_NOT_LEAK",
    pageName: "Riverside PTA",
    tokenExpiresAt: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-02T00:00:00.000Z",
    ...overrides,
  };
}

describe("toMetaSettingsConnectionView", () => {
  it("returns null for a null connection", () => {
    assert.equal(toMetaSettingsConnectionView(null), null);
  });

  it("omits pageAccessToken and never copies the decrypted token", () => {
    const view = toMetaSettingsConnectionView(sampleConnection());
    assert.ok(view);
    assert.equal(view.facebookPageId, "page-123");
    assert.equal(view.instagramAccountId, "ig-456");
    assert.equal(view.pageName, "Riverside PTA");
    assert.equal(view.connected, true);
    assert.equal(view.hasInstagram, true);
    assert.equal(view.configuredViaEnv, false);
    assert.equal(
      Object.prototype.hasOwnProperty.call(view, "pageAccessToken"),
      false,
    );
    assert.equal(
      JSON.stringify(view).includes("SECRET_PAGE_ACCESS_TOKEN_DO_NOT_LEAK"),
      false,
    );
  });

  it("marks connected false when the Page token is missing", () => {
    const view = toMetaSettingsConnectionView(
      sampleConnection({ pageAccessToken: "" }),
    );
    assert.ok(view);
    assert.equal(view.connected, false);
  });

  it("marks configuredViaEnv when the connection id is env", () => {
    const view = toMetaSettingsConnectionView(
      sampleConnection({ id: "env", organizationId: "env" }),
    );
    assert.ok(view);
    assert.equal(view.configuredViaEnv, true);
  });

  it("marks hasInstagram false when Instagram is empty", () => {
    const view = toMetaSettingsConnectionView(
      sampleConnection({ instagramAccountId: "  " }),
    );
    assert.ok(view);
    assert.equal(view.hasInstagram, false);
  });
});
