/**
 * Load gitignored session fixture produced by scripts/mint-sessions.mjs.
 *
 * IMPORTANT: k6 `open()` only works in init context. Call loadSessionsFixture()
 * at module top-level of entry scripts (or from a module imported there).
 */

let cachedFixture = null;

/**
 * @returns {{
 *   testRunId?: string,
 *   sessions: Array<Record<string, unknown>>,
 *   schools: Array<Record<string, unknown>>,
 *   foreignProbe?: { organizationId: string, eventId: string, eventTitle?: string } | null
 * }}
 */
export function loadSessionsFixture(env = __ENV) {
  if (cachedFixture) return cachedFixture;

  // k6 open() resolves relative paths relative to *this file*, not the
  // entry script or process cwd — so paths must climb from helpers/.
  const path = env.K6_SESSIONS_FILE || env.SESSIONS_FILE || "";
  const candidates = path
    ? [path]
    : ["../data/sessions.local.json", "./data/sessions.local.json"];

  for (const candidate of candidates) {
    try {
      const raw = open(candidate);
      cachedFixture = normalizeFixture(JSON.parse(raw));
      return cachedFixture;
    } catch {
      // try next
    }
  }

  cachedFixture = { sessions: [], schools: [], foreignProbe: null };
  return cachedFixture;
}

function normalizeFixture(parsed) {
  if (Array.isArray(parsed)) {
    return { sessions: parsed, schools: [], foreignProbe: null };
  }
  return {
    testRunId: parsed.testRunId,
    sessions: parsed.sessions || [],
    schools: parsed.schools || [],
    foreignProbe: parsed.foreignProbe || null,
  };
}
