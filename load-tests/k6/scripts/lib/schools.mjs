/** Shared synthetic school helpers for Node seed/mint/cleanup. */

export const SCHOOL_COUNT = 20;

export function schoolName(index) {
  const n = String(index).padStart(2, "0");
  return `Load Test School ${n}`;
}

export const ROLE_BLUEPRINT = [
  { key: "owner", campaignRole: "admin", orgRoleName: "President", label: "Owner" },
  {
    key: "president",
    campaignRole: "president",
    orgRoleName: "President",
    label: "President",
  },
  {
    key: "vp",
    campaignRole: "vp_communications",
    orgRoleName: "VP Communications",
    label: "VP",
  },
  {
    key: "chair",
    campaignRole: "committee_chair",
    orgRoleName: "Creative Chair",
    label: "Chair",
  },
  {
    key: "volunteer",
    campaignRole: "contributor",
    orgRoleName: "Volunteer Coordinator",
    label: "Volunteer",
  },
  {
    key: "viewer",
    campaignRole: "view_only",
    orgRoleName: "Viewer",
    label: "Viewer",
  },
  {
    key: "vp_events",
    campaignRole: "contributor",
    orgRoleName: "VP Events",
    label: "VP Events",
  },
  {
    key: "chair2",
    campaignRole: "committee_chair",
    orgRoleName: "Website Chair",
    label: "Chair",
  },
];

export function buildSchoolUsers(
  schoolIndex,
  testRunId,
  domain = "loadtest.heyralli.invalid",
) {
  const n = String(schoolIndex).padStart(2, "0");
  return ROLE_BLUEPRINT.map((role) => ({
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

export function k6Prefix(testRunId) {
  return `[k6][${testRunId}]`;
}
