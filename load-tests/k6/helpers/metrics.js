import { Counter, Trend } from "k6/metrics";

export const tenantIsolationFailures = new Counter("tenant_isolation_failures");
export const authFailures = new Counter("auth_failures");
export const unexpected401 = new Counter("unexpected_401");
export const unexpected403 = new Counter("unexpected_403");
export const unexpected429 = new Counter("unexpected_429");
export const unexpected500 = new Counter("unexpected_500");
export const workflowDuration = new Trend("workflow_duration_ms", true);
