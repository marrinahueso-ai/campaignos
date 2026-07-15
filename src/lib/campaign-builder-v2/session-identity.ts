/**
 * Campaign Builder identity helpers.
 *
 * Artwork, captions, and preview state belong to one event/campaign only.
 * Never reuse another campaign's in-memory session just because it has
 * "richer" previews, and never treat the Inspiration campaign dropdown as a
 * rename of the current session.
 */

export function sessionsBelongToSameCampaign(
  sessionEventId: string,
  routeEventId: string,
): boolean {
  return Boolean(sessionEventId) && sessionEventId === routeEventId;
}

/**
 * Soft remounts may re-run hydrate while the same campaign is open. Keep the
 * richer in-memory session only when it is still for this route's eventId.
 * Switching campaigns must always take the hydrated target session.
 */
export function shouldRetainInMemorySessionOnHydrate(input: {
  previousEventId: string;
  routeEventId: string;
  previousRichness: number;
  hydratedRichness: number;
}): boolean {
  if (!sessionsBelongToSameCampaign(input.previousEventId, input.routeEventId)) {
    return false;
  }
  return input.previousRichness > input.hydratedRichness;
}
