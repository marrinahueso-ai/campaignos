/**
 * Dashboard Volunteers card + Attention volunteer count.
 * Past event dates roll off; today and future underfilled events remain.
 */
export function filterDashboardUnderfilledVolunteerEvents<
  T extends { needsPeople: boolean; date: string },
>(events: T[], today: string): T[] {
  return events.filter(
    (event) => event.needsPeople && event.date >= today,
  );
}
