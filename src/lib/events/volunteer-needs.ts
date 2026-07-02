/** Legacy workspace seed values — not explicit user input; treat as absent. */
const LEGACY_SEEDED_VOLUNTEER_NEEDS = [
  "8 volunteers needed for setup and check-in",
  "8 volunteers needed for setup & check-in",
] as const;

function normalizeVolunteerText(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

/**
 * Returns volunteer needs only when explicitly entered for the event.
 * Strips known legacy seed defaults and blank values.
 */
export function sanitizeVolunteerNeeds(
  value: string | null | undefined,
): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;

  const normalized = normalizeVolunteerText(trimmed);
  for (const legacy of LEGACY_SEEDED_VOLUNTEER_NEEDS) {
    if (normalized === normalizeVolunteerText(legacy)) {
      return null;
    }
  }

  if (/^\d+ volunteers needed for setup (&|and) check-in$/i.test(trimmed)) {
    return null;
  }

  return trimmed;
}

export function hasVerifiedVolunteerNeeds(
  value: string | null | undefined,
): boolean {
  return sanitizeVolunteerNeeds(value) !== null;
}
