import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildIntegrationSettingsPath,
  buildMetaOAuthStartPath,
  buildOAuthStartPath,
  safeOAuthReturnTo,
} from "../oauth.ts";

test("safeOAuthReturnTo accepts in-app absolute paths", () => {
  assert.equal(safeOAuthReturnTo("/inbox", "/settings/meta"), "/inbox");
  assert.equal(
    safeOAuthReturnTo("/insights?from=2026-01-01", "/settings/meta"),
    "/insights?from=2026-01-01",
  );
});

test("safeOAuthReturnTo rejects open redirects", () => {
  assert.equal(safeOAuthReturnTo("//evil.com", "/settings/meta"), "/settings/meta");
  assert.equal(safeOAuthReturnTo("https://evil.com", "/settings/meta"), "/settings/meta");
  assert.equal(safeOAuthReturnTo(null, "/settings/canva"), "/settings/canva");
});

test("buildMetaOAuthStartPath includes returnTo and optional rerequest", () => {
  assert.equal(
    buildMetaOAuthStartPath({ returnTo: "/inbox", pageId: "123", authType: "rerequest" }),
    "/api/meta/oauth/start?returnTo=%2Finbox&pageId=123&auth_type=rerequest",
  );
});

test("buildOAuthStartPath builds Canva, Monday, and Google paths", () => {
  assert.equal(
    buildOAuthStartPath("canva", { returnTo: "/settings/canva" }),
    "/api/canva/oauth/start?returnTo=%2Fsettings%2Fcanva",
  );
  assert.equal(
    buildOAuthStartPath("monday", { returnTo: "/tasks" }),
    "/api/monday/oauth/start?returnTo=%2Ftasks",
  );
  assert.equal(
    buildOAuthStartPath("google", { returnTo: "/settings/integrations/calendar" }),
    "/api/google/oauth/start?returnTo=%2Fsettings%2Fintegrations%2Fcalendar",
  );
});

test("buildIntegrationSettingsPath adds returnTo for feature deep-links", () => {
  assert.equal(
    buildIntegrationSettingsPath("meta", "/insights"),
    "/settings/meta?returnTo=%2Finsights",
  );
  assert.equal(buildIntegrationSettingsPath("meta"), "/settings/meta");
});
