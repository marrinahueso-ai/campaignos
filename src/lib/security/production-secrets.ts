/**
 * Fail-fast checks for secrets that must be present in deployed environments.
 * Called from instrumentation on server start — logs loudly; does not crash the
 * process (Vercel would otherwise flap), but surfaces misconfig in logs/Sentry.
 */

export type ProductionSecretCheck = {
  ok: boolean;
  missing: string[];
  warnings: string[];
};

function isDeployedEnvironment(): boolean {
  const vercelEnv = (process.env.VERCEL_ENV || "").toLowerCase();
  return vercelEnv === "production" || vercelEnv === "preview";
}

export function checkProductionSecrets(): ProductionSecretCheck {
  if (!isDeployedEnvironment()) {
    return { ok: true, missing: [], warnings: [] };
  }

  const required = [
    "CRON_SECRET",
    "SUPABASE_SERVICE_ROLE_KEY",
    "OAUTH_TOKEN_ENCRYPTION_KEY",
    "STRIPE_WEBHOOK_SECRET",
    "STRIPE_SECRET_KEY",
    "DEVELOPER_AGREEMENT_DOWNLOAD_SECRET",
    "FOUNDING_ACCESS_LINK_SECRET",
  ] as const;

  const missing: string[] = [];
  for (const key of required) {
    if (!process.env[key]?.trim()) {
      missing.push(key);
    }
  }

  const warnings: string[] = [];
  if (process.env.ALLOW_ROLE_SIMULATOR === "true") {
    warnings.push(
      "ALLOW_ROLE_SIMULATOR=true is set in a deployed environment — privilege elevation tooling is enabled.",
    );
  }

  const oauthKey = process.env.OAUTH_TOKEN_ENCRYPTION_KEY?.trim();
  if (oauthKey) {
    try {
      const buf = Buffer.from(oauthKey, "base64");
      if (buf.length !== 32) {
        missing.push("OAUTH_TOKEN_ENCRYPTION_KEY(invalid_length)");
      }
    } catch {
      missing.push("OAUTH_TOKEN_ENCRYPTION_KEY(invalid_base64)");
    }
  }

  return {
    ok: missing.length === 0,
    missing,
    warnings,
  };
}

/** Log production secret gaps once at boot. */
export function reportProductionSecretGaps(): ProductionSecretCheck {
  const result = checkProductionSecrets();
  if (!result.ok) {
    console.error(
      "[security] Missing required secrets in deployed environment:",
      result.missing.join(", "),
    );
  }
  for (const warning of result.warnings) {
    console.warn(`[security] ${warning}`);
  }
  return result;
}
