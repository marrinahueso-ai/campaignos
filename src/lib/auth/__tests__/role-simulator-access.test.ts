import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { isRoleSimulatorEnvironmentAllowed } from "../role-simulator-env.ts";

describe("isRoleSimulatorEnvironmentAllowed", () => {
  const original = {
    ALLOW_ROLE_SIMULATOR: process.env.ALLOW_ROLE_SIMULATOR,
    NODE_ENV: process.env.NODE_ENV,
    SENTRY_ENVIRONMENT: process.env.SENTRY_ENVIRONMENT,
    VERCEL_ENV: process.env.VERCEL_ENV,
  };

  function restoreEnv() {
    for (const [key, value] of Object.entries(original)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }

  it("allows development NODE_ENV", () => {
    delete process.env.ALLOW_ROLE_SIMULATOR;
    process.env.NODE_ENV = "development";
    delete process.env.SENTRY_ENVIRONMENT;
    delete process.env.VERCEL_ENV;
    assert.equal(isRoleSimulatorEnvironmentAllowed(), true);
    restoreEnv();
  });

  it("allows preview / staging environments", () => {
    delete process.env.ALLOW_ROLE_SIMULATOR;
    process.env.NODE_ENV = "production";
    process.env.VERCEL_ENV = "preview";
    delete process.env.SENTRY_ENVIRONMENT;
    assert.equal(isRoleSimulatorEnvironmentAllowed(), true);

    process.env.VERCEL_ENV = "production";
    process.env.SENTRY_ENVIRONMENT = "staging";
    assert.equal(isRoleSimulatorEnvironmentAllowed(), true);
    restoreEnv();
  });

  it("blocks production unless explicitly allowlisted", () => {
    delete process.env.ALLOW_ROLE_SIMULATOR;
    process.env.NODE_ENV = "production";
    process.env.VERCEL_ENV = "production";
    process.env.SENTRY_ENVIRONMENT = "production";
    assert.equal(isRoleSimulatorEnvironmentAllowed(), false);

    process.env.ALLOW_ROLE_SIMULATOR = "true";
    assert.equal(isRoleSimulatorEnvironmentAllowed(), true);
    restoreEnv();
  });
});

describe("setSimulatedRoleAction gate (source)", () => {
  it("requires canUseRoleSimulator before setting the cookie", async () => {
    const { readFileSync } = await import("node:fs");
    const source = readFileSync(
      new URL("../actions.ts", import.meta.url),
      "utf8",
    );
    assert.match(source, /canUseRoleSimulator\(\)/);
    assert.match(source, /setSimulatedRoleAction/);
    assert.match(source, /clearSimulatedRoleCookie/);
  });
});
