import type {
  ParsedRosterCommittee,
  ParsedRosterRole,
} from "@/lib/organization-workspace/parse-roster";

const CHAIR_SUFFIX_PATTERN = /\s+chairs?\s*$/i;
const CO_CHAIR_SUFFIX_PATTERN = /\s+co-?chairs?\s*$/i;

export function normalizeCommitteeDisplayName(rawName: string): string {
  let name = rawName.trim();
  name = name.replace(CO_CHAIR_SUFFIX_PATTERN, "");
  name = name.replace(CHAIR_SUFFIX_PATTERN, "");
  return name.trim();
}

export function isCoChairPosition(rawName: string): boolean {
  return CO_CHAIR_SUFFIX_PATTERN.test(rawName.trim());
}

export function parseCommitteeChairNames(
  contactName: string | null | undefined,
): string[] {
  if (!contactName?.trim()) {
    return [];
  }

  const normalized = contactName.replace(/\u00a0/g, " ");

  return [
    ...new Set(
      normalized
        .split(/[,·|/]+/)
        .map((part) => part.trim())
        .filter(Boolean),
    ),
  ];
}

function joinChairNames(
  existing: string | null,
  incoming: string | null,
): string | null {
  const names = [
    ...parseCommitteeChairNames(existing),
    ...parseCommitteeChairNames(incoming),
  ];

  if (names.length === 0) {
    return null;
  }

  return names.join(", ");
}

function committeeMergeKey(displayName: string): string {
  return displayName.trim().toLowerCase();
}

export function mergeCommitteeCoChairs(
  roles: ParsedRosterRole[],
): ParsedRosterRole[] {
  return roles.map((role) => {
    const merged: ParsedRosterCommittee[] = [];
    const indexByKey = new Map<string, number>();

    for (const committee of role.committees) {
      const displayName = normalizeCommitteeDisplayName(committee.name);
      if (!displayName) {
        continue;
      }

      const key = committeeMergeKey(displayName);
      const existingIndex = indexByKey.get(key);

      if (existingIndex !== undefined) {
        const existing = merged[existingIndex];
        merged[existingIndex] = {
          name: displayName,
          contactName: joinChairNames(existing.contactName, committee.contactName),
          contactEmail: existing.contactEmail ?? committee.contactEmail,
        };
        continue;
      }

      merged.push({
        name: displayName,
        contactName: committee.contactName,
        contactEmail: committee.contactEmail,
      });
      indexByKey.set(key, merged.length - 1);
    }

    return {
      ...role,
      committees: merged,
    };
  });
}
