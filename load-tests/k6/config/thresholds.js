/**
 * First-20-school readiness thresholds.
 * Adjust here without rewriting scenario files.
 */

/** Percentiles printed/exported in every run's summary (p50/p90/p95/p99/max). */
export const SUMMARY_TREND_STATS = [
  "avg",
  "min",
  "med",
  "p(90)",
  "p(95)",
  "p(99)",
  "max",
];

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
    "http_req_duration{route:calendar}": ["p(95)<2000"],
    "http_req_duration{route:events_list}": ["p(95)<2000"],

    // No dropped iterations under the light-peak / 20-school ramps
    dropped_iterations: ["count==0"],

    // Reporting-only breakdown for every other tagged route (loose ceiling,
    // not a launch-readiness gate) — k6 only keeps per-tag Trend data for
    // combinations referenced by a threshold, so these exist purely to
    // surface "metrics grouped by route" in the summary/JSON export.
    "http_req_duration{route:event_detail}": ["p(95)<60000"],
    "http_req_duration{route:event_planning}": ["p(95)<60000"],
    "http_req_duration{route:communications}": ["p(95)<60000"],
    "http_req_duration{route:create_with_ai}": ["p(95)<60000"],
    "http_req_duration{route:campaign_builder}": ["p(95)<60000"],
    "http_req_duration{route:approvals}": ["p(95)<60000"],
    "http_req_duration{route:approvals_revision}": ["p(95)<60000"],
    "http_req_duration{route:event_approvals}": ["p(95)<60000"],
    "http_req_duration{route:settings_organization}": ["p(95)<60000"],
    "http_req_duration{route:settings_team_access}": ["p(95)<60000"],
    "http_req_duration{route:dashboard_after_switch}": ["p(95)<60000"],
    "http_req_duration{route:cross_tenant}": ["p(95)<60000"],

    // NOTE: workflow_duration_ms is intentionally NOT gated here. It measures
    // whole-workflow wall time including the realistic 2-8s think-time pauses
    // between steps (by design, per the workload spec), so a multi-step
    // workflow's p95 can legitimately run 20-35s even when every underlying
    // http_req_duration is sub-second. It remains a reported Trend metric
    // (see results JSON / summary) for visibility, just not a pass/fail gate.
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
    "http_req_duration{route:calendar}": ["p(95)<3500"],
    "http_req_duration{route:events_list}": ["p(95)<3500"],
  };
}

/**
 * Light-peak launch-readiness thresholds — same correctness/safety gates as
 * buildThresholds(), with an explicit internal write-request ceiling in case
 * K6_ALLOW_WRITES is ever enabled for this profile.
 */
export function buildLightPeakThresholds(opts = {}) {
  return {
    ...buildThresholds(opts),
    "http_req_duration{kind:write}": ["p(95)<3000"],
  };
}
