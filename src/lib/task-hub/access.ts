import type { CampaignRole } from "@/lib/auth/campaign-roles";
import { parseCommitteeChairNames } from "@/lib/organization-workspace/merge-committee-chairs";
import type { OrganizationCommittee } from "@/types/organization-workspace";
import type { TaskHubViewScope } from "@/types/task-hub";

const MASTER_LIST_ROLES: CampaignRole[] = [
  "admin",
  "president",
  "vp_communications",
];

export interface TaskHubUserContext {
  campaignRole: CampaignRole;
  displayName: string | null;
  email: string | null;
}

export function normalizePersonToken(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function personTokensMatch(a: string, b: string): boolean {
  const normA = normalizePersonToken(a);
  const normB = normalizePersonToken(b);

  if (!normA || !normB) {
    return false;
  }

  if (normA === normB || normA.includes(normB) || normB.includes(normA)) {
    return true;
  }

  const firstA = normA.split(/\s+/)[0] ?? "";
  const firstB = normB.split(/\s+/)[0] ?? "";

  return firstA.length > 2 && firstA === firstB;
}

export function userChairsCommittee(
  user: TaskHubUserContext,
  committee: OrganizationCommittee,
): boolean {
  const chairNames = parseCommitteeChairNames(committee.contactName);
  if (chairNames.length === 0) {
    return false;
  }

  const emailLocal = user.email?.split("@")[0]?.trim() ?? "";

  for (const chairName of chairNames) {
    if (user.displayName && personTokensMatch(user.displayName, chairName)) {
      return true;
    }

    if (user.email && personTokensMatch(user.email, chairName)) {
      return true;
    }

    if (
      emailLocal &&
      normalizePersonToken(chairName).replace(/\s+/g, "").includes(emailLocal)
    ) {
      return true;
    }
  }

  return false;
}

export function resolveTaskHubViewScope(
  campaignRole: CampaignRole,
): TaskHubViewScope {
  return MASTER_LIST_ROLES.includes(campaignRole)
    ? "all_committees"
    : "chaired_committees";
}

export function resolveVisibleCommittees(
  committees: OrganizationCommittee[],
  user: TaskHubUserContext,
): OrganizationCommittee[] {
  const scope = resolveTaskHubViewScope(user.campaignRole);

  if (scope === "all_committees") {
    return committees;
  }

  const chaired = committees.filter((committee) =>
    userChairsCommittee(user, committee),
  );

  return chaired;
}

export function taskHubScopeLabel(scope: TaskHubViewScope): string {
  return scope === "all_committees"
    ? "All committees"
    : "Your committees";
}

export function canEditTaskHub(scope: TaskHubViewScope): boolean {
  return scope === "all_committees" || scope === "chaired_committees";
}

export function canAssignInScope(scope: TaskHubViewScope): boolean {
  return scope === "all_committees" || scope === "chaired_committees";
}
