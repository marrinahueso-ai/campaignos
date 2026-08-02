/**
 * First-20-school readiness thresholds.
 * Adjust here without rewriting scenario files.
 */

/** @param {{ allowWrites?: boolean }} [opts] */
export function buildThresholds(opts = {}) {
  const thresholds = {
    // Overall HTTP failure rate below 1%
    http_req_failed: ["rate<0.01"],

    // No tenant-isolation failures
    tenant_isolation_failures: ["count==0"],

    // No unexpected authentication failures (login redirects / bad session)
    auth_failures: ["count==0"],

    // Checks pass rate above 99%
    checks: ["rate>0.99"],

    // Unexpected server / auth status counters (allow tiny noise on 429)
    unexpected_401: ["count==0"],
    unexpected_403: ["count<5"],
    unexpected_429: ["count<10"],
    unexpected_500: ["count==0"],

    // Ordinary read p95 < 1500ms (tagged http requests)
    "http_req_duration{kind:read}": ["p(95)<1500"],

    // Dashboard + calendar + event list p95 < 2000ms
    "http_req_duration{route:dashboard}": ["p(95)<2000"],
    "http_req_duration{route:events_list}": ["p(95)<2000"],

    // Whole-workflow wall time (multi-step, includes think-time pauses)
    workflow_duration_ms: ["p(95)<10000"],
  };

  if (opts.allowWrites) {
    thresholds["http_req_duration{kind:write}"] = ["p(95)<3000"];
  }

  return thresholds;
}

/** Looser smoke thresholds so cold preview wake does not fail the gate. */
export function buildSmokeThresholds() {
  return {
    ...buildThresholds(),
    http_req_failed: ["rate<0.02"],
    checks: ["rate>0.95"],
    "http_req_duration{kind:read}": ["p(95)<3000"],
    "http_req_duration{route:dashboard}": ["p(95)<3500"],
    "http_req_duration{route:events_list}": ["p(95)<3500"],
  };
}
