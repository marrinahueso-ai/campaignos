export const VOLUNTEER_INTELLIGENCE_DEMO = {
  labels: {
    workspace: "Volunteers",
    title: "Volunteer Master",
    event: "Back to School Fair",
  },
  kpis: {
    fillRate: 72,
    underfilled: 3,
    totalVolunteers: 48,
  },
  roles: [
    { name: "Welcome table", filled: 4, needed: 4 },
    { name: "Classroom guides", filled: 3, needed: 6 },
    { name: "Supply drop-off", filled: 2, needed: 4 },
    { name: "Cleanup crew", filled: 1, needed: 3 },
  ],
  toast: {
    title: "Staffing picture clear",
    description: "Three roles still need help before August 5.",
  },
} as const;
