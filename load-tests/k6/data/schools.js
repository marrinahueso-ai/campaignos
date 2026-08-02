/**
 * Synthetic school naming for the first-20-school simulation.
 * Used by Node seed scripts (and documented for k6 fixtures).
 */

export const SCHOOL_COUNT = 20;

export function schoolName(index) {
  const n = String(index).padStart(2, "0");
  return `Load Test School ${n}`;
}

export function schoolSlug(index, testRunId) {
  const n = String(index).padStart(2, "0");
  return `lt-${n}-${testRunId}`.toLowerCase().replace(/[^a-z0-9-]/g, "-");
}

/** Roles seeded per school (mapped to campaign_role + organization role label). */
export const ROLE_BLUEPRINT = [
  { key: "owner", campaignRole: "admin", orgRoleName: "President", label: "Owner" },
  { key: "president", campaignRole: "president", orgRoleName: "President", label: "President" },
  { key: "vp", campaignRole: "vp_communications", orgRoleName: "VP Communications", label: "VP" },
  { key: "chair", campaignRole: "committee_chair", orgRoleName: "Creative Chair", label: "Chair" },
  { key: "volunteer", campaignRole: "contributor", orgRoleName: "Volunteer Coordinator", label: "Volunteer" },
  { key: "viewer", campaignRole: "view_only", orgRoleName: "Viewer", label: "Viewer" },
];

/**
 * Build 5–10 user emails per school.
 * @param {number} schoolIndex 1–20
 * @param {string} testRunId
 * @param {string} [domain]
 */
export function buildSchoolUsers(schoolIndex, testRunId, domain = "loadtest.heyralli.invalid") {
  const n = String(schoolIndex).padStart(2, "0");
  // 6 core roles + 2 extra contributors = 8 users (within 5–10)
  const extras = [
    { key: "vp_events", campaignRole: "contributor", orgRoleName: "VP Events", label: "VP Events" },
    { key: "chair2", campaignRole: "committee_chair", orgRoleName: "Website Chair", label: "Chair" },
  ];
  const roles = [...ROLE_BLUEPRINT, ...extras];
  return roles.map((role) => ({
    ...role,
    email: `loadtest+s${n}-${role.key}-${testRunId}@${domain}`.toLowerCase(),
    displayName: `[k6][${testRunId}] ${schoolName(schoolIndex)} ${role.label}`,
  }));
}

export function listSchools(count = SCHOOL_COUNT) {
  return Array.from({ length: count }, (_, i) => {
    const index = i + 1;
    return { index, name: schoolName(index) };
  });
}
