import { pickWorkflow } from "../config/workload.js";
import { pickSession } from "../helpers/auth.js";
import { runApprover, runCrossTenantProbe } from "./approvals.js";
import { runCalendarEventsUser } from "./calendar-events.js";
import { runCommunicationsCreator } from "./communications-creator.js";
import { runCommunicationsHubViewer } from "./communications-hub.js";
import { runDashboardViewer } from "./dashboard.js";

/**
 * One VU iteration: pick school session + weighted workflow.
 * @param {object} data
 * @param {{ schoolIndexes?: number[]|null, crossTenantEvery?: number }} [opts]
 */
export function runWeightedIteration(
  data,
  { schoolIndexes = null, crossTenantEvery = 0 } = {},
) {
  const session = pickSession(data, { schoolIndexes });
  const workflow = pickWorkflow(Math.random);

  switch (workflow) {
    case "calendar":
      runCalendarEventsUser(data, session);
      break;
    case "communicationsCreator":
      runCommunicationsCreator(data, session);
      break;
    case "approvals":
      runApprover(data, session);
      break;
    case "communicationsHub":
      runCommunicationsHubViewer(data, session);
      break;
    case "dashboard":
    default:
      runDashboardViewer(data, session);
      break;
  }

  // Occasional controlled negative (staging fixtures only)
  if (
    crossTenantEvery > 0 &&
    data.foreignProbe &&
    __ITER > 0 &&
    __ITER % crossTenantEvery === 0
  ) {
    runCrossTenantProbe(data, session);
  }
}
