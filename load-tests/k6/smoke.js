/**
 * Hey Ralli / CampignOS — k6 smoke (read-heavy authenticated pages)
 *
 * Auth: browser-exported Supabase session Cookie header (recommended).
 * Password login via k6 is brittle (Next.js server actions + login rate limits).
 *
 * Never hit AI generate, Canva, Meta publish, or write-heavy mutations here.
 *
 * Run (from repo root):
 *   export $(grep -v '^#' load-tests/k6/cookies.env | xargs)
 *   k6 run load-tests/k6/smoke.js
 *
 * Or inline:
 *   BASE_URL=https://… COOKIE='sb-…=…' k6 run load-tests/k6/smoke.js
 *
 * Scenarios via env:
 *   SCENARIO=smoke|load|soak|spike  (default: smoke)
 */

import http from "k6/http";
import { check, group, sleep } from "k6";
import { Rate, Trend } from "k6/metrics";

const baseUrl = (__ENV.BASE_URL || "").replace(/\/$/, "");
const cookieHeader = __ENV.COOKIE || __ENV.COOKIE_HEADER || "";
const scenarioName = (__ENV.SCENARIO || "smoke").toLowerCase();

/** Safe read-only dashboard hubs (see docs/qa/performance-budget.md). */
const READ_PATHS = [
  "/dashboard",
  "/events",
  "/tasks",
  "/approvals",
  "/calendar",
];

const authFailRate = new Rate("auth_redirect_rate");
const pageDuration = new Trend("page_duration_ms", true);

const scenarios = {
  smoke: {
    executor: "constant-vus",
    vus: 2,
    duration: "1m",
  },
  load: {
    executor: "ramping-vus",
    startVUs: 0,
    stages: [
      { duration: "1m", target: 5 },
      { duration: "3m", target: 10 },
      { duration: "1m", target: 0 },
    ],
    gracefulRampDown: "30s",
  },
  soak: {
    executor: "constant-vus",
    vus: 5,
    duration: "15m",
  },
  spike: {
    executor: "ramping-vus",
    startVUs: 0,
    stages: [
      { duration: "30s", target: 2 },
      { duration: "30s", target: 20 },
      { duration: "1m", target: 20 },
      { duration: "30s", target: 2 },
    ],
    gracefulRampDown: "30s",
  },
};

if (!scenarios[scenarioName]) {
  throw new Error(
    `Unknown SCENARIO="${scenarioName}". Use smoke|load|soak|spike.`,
  );
}

export const options = {
  scenarios: {
    [scenarioName]: scenarios[scenarioName],
  },
  thresholds: {
    // HTTP-level: keep failures low under read load.
    http_req_failed: ["rate<0.05"],
    // p95 wall time for document GETs (RSC HTML). Aligns directionally with
    // the ≤2s interactive budget in docs/qa/performance-budget.md — k6 measures
    // TTFB+body, not "primary heading visible".
    http_req_duration: ["p(95)<3000"],
    page_duration_ms: ["p(95)<3000"],
    // Redirects to /login mean the cookie expired or was wrong.
    auth_redirect_rate: ["rate<0.01"],
    checks: ["rate>0.95"],
  },
};

function requireEnv() {
  if (!baseUrl) {
    throw new Error("Set BASE_URL (staging/preview preferred).");
  }
  if (!cookieHeader) {
    throw new Error(
      "Set COOKIE (or COOKIE_HEADER) to a logged-in browser Cookie header. " +
        "See load-tests/k6/README.md — password login is not used here.",
    );
  }
}

function requestHeaders() {
  return {
    Cookie: cookieHeader,
    Accept: "text/html,application/xhtml+xml",
    "User-Agent": "k6-heyralli-loadtest/1.0",
  };
}

function looksLikeLoginRedirect(res) {
  const loc = res.headers.Location || res.headers.location || "";
  if (loc.includes("/login")) return true;
  // Followed redirects: final URL or body hints.
  if (res.url && res.url.includes("/login")) return true;
  return false;
}

function getPage(path) {
  const url = `${baseUrl}${path}`;
  const res = http.get(url, {
    headers: requestHeaders(),
    redirects: 5,
    tags: { name: path },
  });

  pageDuration.add(res.timings.duration, { path });

  const redirectedToLogin = looksLikeLoginRedirect(res);
  authFailRate.add(redirectedToLogin);

  check(res, {
    [`${path} status 200`]: (r) => r.status === 200,
    [`${path} not login redirect`]: () => !redirectedToLogin,
    [`${path} body not empty`]: (r) =>
      r.body && String(r.body).length > 200,
  });

  return res;
}

export function setup() {
  requireEnv();
  // Warm one path so cold serverless / preview wake does not dominate smoke.
  const warm = http.get(`${baseUrl}/dashboard`, {
    headers: requestHeaders(),
    redirects: 5,
  });
  if (looksLikeLoginRedirect(warm) || warm.status !== 200) {
    throw new Error(
      `Auth warm-up failed (status=${warm.status}). Re-export COOKIE from a ` +
        `logged-in session on the same host as BASE_URL.`,
    );
  }
  return { baseUrl, paths: READ_PATHS };
}

export default function (data) {
  group("read hubs", () => {
    for (const path of data.paths) {
      getPage(path);
      // Think time — humans do not hammer every hub back-to-back.
      sleep(1 + Math.random() * 2);
    }
  });
}
