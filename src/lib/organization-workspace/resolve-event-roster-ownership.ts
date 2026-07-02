import { parseCommitteeChairNames } from "@/lib/organization-workspace/merge-committee-chairs";
import {
  DEFAULT_COMMITTEE_ROLE_NAMES,
  EVENT_TYPE_TO_COMMITTEE,
} from "@/lib/organization-workspace/constants";
import type { Event } from "@/types";
import type {
  OrganizationCommittee,
  OrganizationRole,
  OrganizationWorkspaceData,
} from "@/types/organization-workspace";

export type EventRosterOwnership = {
  committeeName: string | null;
  chairNames: string[];
  vpRoleName: string | null;
  vpContactName: string | null;
  committeeFilled: boolean;
  vpFilled: boolean;
};

function normalizeMatchText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function significantWords(value: string): string[] {
  const stop = new Set([
    "the",
    "and",
    "for",
    "with",
    "day",
    "first",
    "school",
    "event",
    "committee",
    "chair",
    "co",
  ]);

  return normalizeMatchText(value)
    .split(/\s+/)
    .filter((word) => word.length > 2 && !stop.has(word));
}

function matchScore(eventTitle: string, committeeName: string): number {
  const eventNorm = normalizeMatchText(eventTitle);
  const committeeNorm = normalizeMatchText(committeeName);

  if (!eventNorm || !committeeNorm) {
    return 0;
  }

  if (eventNorm.includes(committeeNorm) || committeeNorm.includes(eventNorm)) {
    return Math.min(eventNorm.length, committeeNorm.length) + 100;
  }

  const eventWords = significantWords(eventTitle);
  const committeeWords = significantWords(committeeName);

  if (eventWords.length === 0 || committeeWords.length === 0) {
    return 0;
  }

  let matches = 0;
  for (const word of eventWords) {
    if (
      committeeWords.some(
        (committeeWord) =>
          committeeWord.includes(word) || word.includes(committeeWord),
      )
    ) {
      matches += 1;
    }
  }

  return matches;
}

function findRoleById(
  roles: OrganizationRole[],
  roleId: string | null,
): OrganizationRole | null {
  if (!roleId) {
    return null;
  }

  return roles.find((role) => role.id === roleId) ?? null;
}

function findCommitteeByEventType(
  event: Event,
  committees: OrganizationCommittee[],
): OrganizationCommittee | null {
  if (!event.eventType) {
    return null;
  }

  const committeeKey = EVENT_TYPE_TO_COMMITTEE[event.eventType];
  if (!committeeKey) {
    return null;
  }

  return (
    committees.find((committee) => committee.eventMatchKey === committeeKey) ??
    null
  );
}

function findCommitteeByTitle(
  event: Event,
  committees: OrganizationCommittee[],
): OrganizationCommittee | null {
  let best: OrganizationCommittee | null = null;
  let bestScore = 2;

  for (const committee of committees) {
    const score = matchScore(event.title, committee.name);
    if (score > bestScore) {
      best = committee;
      bestScore = score;
    }
  }

  return best;
}

function resolveVpFromEventType(
  event: Event,
  roles: OrganizationRole[],
): OrganizationRole | null {
  if (!event.eventType) {
    return null;
  }

  const committeeKey = EVENT_TYPE_TO_COMMITTEE[event.eventType];
  if (!committeeKey) {
    return null;
  }

  const defaultVpName = DEFAULT_COMMITTEE_ROLE_NAMES[committeeKey] ?? null;

  if (!defaultVpName) {
    return null;
  }

  return (
    roles.find(
      (role) => role.name.toLowerCase() === defaultVpName.toLowerCase(),
    ) ?? null
  );
}

export function resolveEventRosterOwnership(
  event: Event,
  workspace: OrganizationWorkspaceData,
): EventRosterOwnership {
  const committee =
    findCommitteeByTitle(event, workspace.committees) ??
    findCommitteeByEventType(event, workspace.committees);

  const vpRole =
    findRoleById(workspace.roles, committee?.parentRoleId ?? null) ??
    resolveVpFromEventType(event, workspace.roles);

  const chairNames = committee
    ? parseCommitteeChairNames(committee.contactName)
    : [];

  return {
    committeeName: committee?.name ?? null,
    chairNames,
    vpRoleName: vpRole?.name ?? null,
    vpContactName: vpRole?.contactName ?? null,
    committeeFilled: chairNames.length > 0,
    vpFilled: Boolean(vpRole?.contactName?.trim()),
  };
}

export function buildEventRosterOwnershipMap(
  events: Event[],
  workspace: OrganizationWorkspaceData | null,
): Map<string, EventRosterOwnership> {
  const map = new Map<string, EventRosterOwnership>();

  if (!workspace) {
    return map;
  }

  for (const event of events) {
    map.set(event.id, resolveEventRosterOwnership(event, workspace));
  }

  return map;
}
