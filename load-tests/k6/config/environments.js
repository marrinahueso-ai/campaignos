/**
 * Target host + safety guards for Hey Ralli k6 suites.
 * Refuse production hostnames unless K6_ALLOW_PRODUCTION=true.
 */

const PRODUCTION_HOST_PATTERNS = [
  /^heyralli\.com$/i,
  /^www\.heyralli\.com$/i,
  /^app\.heyralli\.com$/i,
  /^campaignos\.(com|app)$/i,
  /^www\.campaignos\.(com|app)$/i,
];

export function normalizeBaseUrl(raw) {
  return String(raw || "")
    .trim()
    .replace(/\/$/, "");
}

export function hostnameFromBaseUrl(baseUrl) {
  // Avoid relying on the URL constructor — k6's runtime is stricter than Node.
  const m = String(baseUrl || "").match(/^https?:\/\/([^/?#]+)/i);
  if (!m) return "";
  return m[1].split("@").pop().split(":")[0];
}

export function isProductionLikeHost(hostname) {
  if (!hostname) return false;
  return PRODUCTION_HOST_PATTERNS.some((re) => re.test(hostname));
}

/**
 * Validate required env and production override. Throws on unsafe/missing config.
 * @returns {{ baseUrl: string, testRunId: string, allowWrites: boolean, hostname: string }}
 */
export function resolveEnvironment(env = __ENV) {
  const baseUrl = normalizeBaseUrl(env.BASE_URL);
  const testRunId = String(env.TEST_RUN_ID || "").trim();
  const allowWrites = String(env.K6_ALLOW_WRITES || "").toLowerCase() === "true";
  const allowProduction =
    String(env.K6_ALLOW_PRODUCTION || "").toLowerCase() === "true";

  if (!baseUrl) {
    throw new Error(
      "BASE_URL is required (staging or local). Example: https://your-preview.vercel.app",
    );
  }

  if (!testRunId) {
    throw new Error(
      "TEST_RUN_ID is required so seeded/created records can be identified and cleaned up.",
    );
  }

  if (!/^https?:\/\//i.test(baseUrl)) {
    throw new Error(
      `BASE_URL must start with http:// or https:// (got: ${baseUrl})`,
    );
  }
  const hostname = hostnameFromBaseUrl(baseUrl);
  if (!hostname) {
    throw new Error(`BASE_URL is not a valid URL: ${baseUrl}`);
  }

  const prodLike = isProductionLikeHost(hostname);
  if (prodLike) {
    console.error("");
    console.error(
      "!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!",
    );
    console.error(
      `  WARNING: BASE_URL host looks production-like: ${hostname}`,
    );
    console.error(
      "  Load tests must not run against real schools by default.",
    );
    console.error(
      "!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!",
    );
    console.error("");
    if (!allowProduction) {
      throw new Error(
        `Refusing to run against production-like host "${hostname}". ` +
          `Set K6_ALLOW_PRODUCTION=true only if you intentionally accept the risk.`,
      );
    }
  }

  if (hostname === "localhost" || hostname === "127.0.0.1") {
    console.warn(
      `[k6] Targeting local host ${hostname}. Ensure next start/dev and seeded data are ready.`,
    );
  }

  return { baseUrl, testRunId, allowWrites, hostname, productionOverride: prodLike && allowProduction };
}

export const ACTIVE_ORGANIZATION_COOKIE = "campaignos-active-organization-id";
export const K6_USER_AGENT = "k6-heyralli-loadtest/1.0";
