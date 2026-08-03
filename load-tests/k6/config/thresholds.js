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

/**
 * Launch-spike (30-VU) thresholds — identical launch gates to the validated
 * 15-VU light-peak profile (tenant isolation, auth, error rates, dropped
 * iterations, and route-level p95 ceilings are not relaxed for higher
 * concurrency).
 */
export function buildLaunchSpikeThresholds(opts = {}) {
  return buildLightPeakThresholds(opts);
}

/**
 * Headroom (50-VU) thresholds — same hard launch gates as light-peak /
 * launch-spike. Tail-latency counters (slow_req_over_*) are observational
 * only and are not pass/fail gates.
 */
export function buildHeadroom50Thresholds(opts = {}) {
  return buildLaunchSpikeThresholds(opts);
}

/**
 * Data-scale 100-school / 20-VU thresholds — a stricter, standalone
 * "final architecture gate" builder. Deliberately does NOT spread
 * buildThresholds()/buildLightPeakThresholds() (which use 99%/1%
 * safety-net values by design for the 20-school launch-readiness suite);
 * this profile's explicit purpose is to confirm literal 100% checks and
 * 0% HTTP failures at 100-school scale, matching what every one of the
 * nine prior 20-school runs already achieved in practice (see
 * docs/qa/k6-load-test-findings.md final summary) — so the gate itself
 * should say so, not rely on a looser inherited default.
 *
 * unexpected_403 and unexpected_429 are tightened to 0 here (vs the base
 * builder's small tolerances for cross-tenant-probe/rate-limit noise):
 * empirically, all 9 prior recorded runs — which already exercised this
 * exact same crossTenantEvery=5 probe mechanism — reported 0 for both
 * counters, so a 0 gate matches observed reality rather than inventing new
 * slack. IMPORTANT CAVEAT: recordStatusMetrics() (helpers/checks.js)
 * increments unexpected_403 unconditionally on any 403 response, including
 * the deliberate negative cross-tenant probe's own request — there is no
 * separate "expected vs unexpected" 403/429 counter in the current
 * architecture. If the app ever legitimately returns 403 (rather than the
 * 404/302/200-non-disclosing outcomes assertCrossTenantDenied also
 * accepts) for that probe, this profile's unexpected_403==0 gate would
 * fail even though tenant isolation itself is intact and
 * tenant_isolation_failures would still read 0. This is a known
 * architectural limitation, not silently patched with tolerance here per
 * explicit instruction — see the Phase 3 validation report / design doc
 * for how to interpret that specific failure mode if it occurs.
 */
/**
 * Same correctness + latency gates as the 20-VU data-scale profile.
 * Kept as a named alias so the 50-VU profile's intent is explicit in
 * call sites without loosening any gate for higher concurrency.
 */
export function buildDataScale100School50VuThresholds() {
  return buildDataScale100School20VuThresholds();
}

export function buildDataScale100School20VuThresholds() {
  return {
    // Hard safety/correctness gates — literal 100%/0%, not the 99%/1%
    // base used by the 20-school launch-readiness thresholds.
    http_req_failed: ["rate==0"],
    tenant_isolation_failures: ["count==0"],
    auth_failures: ["count==0"],
    checks: ["rate==1"],
    unexpected_401: ["count==0"],
    unexpected_403: ["count==0"],
    unexpected_429: ["count==0"],
    unexpected_500: ["count==0"],
    dropped_iterations: ["count==0"],

    // Hard route-level p95 gates — identical, already-justified ceilings
    // reused from the validated 20-school suite (buildThresholds()).
    "http_req_duration{kind:read}": ["p(95)<1500"],
    "http_req_duration{route:dashboard}": ["p(95)<2000"],
    "http_req_duration{route:calendar}": ["p(95)<2000"],
    "http_req_duration{route:events_list}": ["p(95)<2000"],

    // Observational only (loose ceiling, not a pass/fail gate) — exists
    // purely so per-route Trend data appears in the summary/JSON export,
    // matching the existing reporting-only convention. No prior documented
    // hard threshold exists for these routes at this traffic pattern/scale.
    "http_req_duration{route:event_detail}": ["p(95)<60000"],
    "http_req_duration{route:event_planning}": ["p(95)<60000"],
    "http_req_duration{route:approvals}": ["p(95)<60000"],
    "http_req_duration{route:approvals_revision}": ["p(95)<60000"],
    "http_req_duration{route:event_approvals}": ["p(95)<60000"],
    "http_req_duration{route:communications}": ["p(95)<60000"],
    "http_req_duration{route:create_with_ai}": ["p(95)<60000"],
    "http_req_duration{route:campaign_builder}": ["p(95)<60000"],
    "http_req_duration{route:settings_organization}": ["p(95)<60000"],
    "http_req_duration{route:settings_team_access}": ["p(95)<60000"],
    "http_req_duration{route:branding}": ["p(95)<60000"],
    "http_req_duration{route:cross_tenant}": ["p(95)<60000"],

    // NOTE: workflow_duration_ms is intentionally NOT gated here — see
    // Finding 3 in docs/qa/k6-load-test-findings.md. It measures
    // whole-workflow wall time including 2-8s think-time pauses between
    // steps and remains a reported Trend only, exactly like every other
    // profile in this suite.
  };
}
