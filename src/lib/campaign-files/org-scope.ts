/**
 * Active-org scoping for Files & Documents.
 * RLS allows any org membership; the product must filter to the switched org.
 */

export type FilesOrgQueryScope =
  | { kind: "none" }
  | { kind: "one"; eventId: string }
  | { kind: "all"; eventIds: string[] };

/**
 * Resolve which event IDs may appear in the Files library for the active org.
 * A requested event outside the org returns `none` (no cross-tenant leak).
 */
export function resolveFilesOrgQueryScope(input: {
  orgEventIds: string[];
  requestedEventId?: string | null;
}): FilesOrgQueryScope {
  const orgEventIds = Array.from(
    new Set(input.orgEventIds.filter((id) => typeof id === "string" && id.length > 0)),
  );
  const requested = input.requestedEventId?.trim() || null;

  if (requested) {
    if (!orgEventIds.includes(requested)) {
      return { kind: "none" };
    }
    return { kind: "one", eventId: requested };
  }

  if (orgEventIds.length === 0) {
    return { kind: "none" };
  }

  return { kind: "all", eventIds: orgEventIds };
}

/** Keep only files whose event belongs to the active org event set. */
export function filterFilesToOrgEventIds<T extends { eventId: string }>(
  files: T[],
  orgEventIds: Iterable<string>,
): T[] {
  const allowed = new Set(
    Array.from(orgEventIds).filter((id) => typeof id === "string" && id.length > 0),
  );
  if (allowed.size === 0) return [];
  return files.filter((file) => allowed.has(file.eventId));
}
