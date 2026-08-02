import { Counter, Trend } from "k6/metrics";

export const tenantIsolationFailures = new Counter("tenant_isolation_failures");
export const authFailures = new Counter("auth_failures");
export const unexpected401 = new Counter("unexpected_401");
export const unexpected403 = new Counter("unexpected_403");
export const unexpected429 = new Counter("unexpected_429");
export const unexpected500 = new Counter("unexpected_500");
export const workflowDuration = new Trend("workflow_duration_ms", true);

/** Observational tail-latency counters (not pass/fail gates). */
export const slowReqOver3s = new Counter("slow_req_over_3s");
export const slowReqOver5s = new Counter("slow_req_over_5s");
export const slowReqOver10s = new Counter("slow_req_over_10s");
export const slowReqOver3sHold = new Counter("slow_req_over_3s_hold");
export const slowReqOver5sHold = new Counter("slow_req_over_5s_hold");
export const slowReqOver10sHold = new Counter("slow_req_over_10s_hold");
