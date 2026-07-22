/**
 * Pick the event Create with AI should open first when the hub redirects.
 * Prefer the soonest upcoming (or today); otherwise the most recent past event.
 */
export function pickDefaultCreateWithAiEvent<
  T extends { id: string; date?: string | null },
>(events: T[], todayIso = new Date().toISOString().slice(0, 10)): T | null {
  if (events.length === 0) {
    return null;
  }

  const sorted = [...events].sort((a, b) => {
    const aDate = a.date?.trim() || "";
    const bDate = b.date?.trim() || "";
    if (aDate === bDate) {
      return a.id.localeCompare(b.id);
    }
    if (!aDate) {
      return 1;
    }
    if (!bDate) {
      return -1;
    }
    return aDate.localeCompare(bDate);
  });

  const upcoming = sorted.find((event) => {
    const date = event.date?.trim();
    return date != null && date >= todayIso;
  });

  if (upcoming) {
    return upcoming;
  }

  return sorted[sorted.length - 1] ?? null;
}
