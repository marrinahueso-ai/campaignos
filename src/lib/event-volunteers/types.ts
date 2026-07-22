export type VolunteerProvider = "signupgenius";

export type VolunteerSourceStatus =
  | "pending_review"
  | "connected"
  | "disconnected"
  | "error";

export type VolunteerSyncStatus = "idle" | "syncing" | "success" | "error";

export type VolunteerAvailabilityStatus =
  | "high_need"
  | "needs_help"
  | "nearly_full"
  | "full"
  | "unknown";

export type VolunteerSignupAssignment = {
  externalKey: string;
  groupName?: string;
  name: string;
  description?: string;
  date?: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  quantityRequested: number | null;
  quantityFilled: number | null;
  quantityOpen: number | null;
};

export type VolunteerAssignmentView = VolunteerSignupAssignment & {
  availabilityStatus: VolunteerAvailabilityStatus;
  sourceOrder: number;
};

export type VolunteerSignupSnapshot = {
  sourceTitle?: string;
  sourceDescription?: string;
  sourceLocation?: string;
  signupDeadline?: string;
  totals: {
    totalSpots: number | null;
    filledSpots: number | null;
    openSpots: number | null;
  };
  assignments: Array<VolunteerSignupAssignment | VolunteerAssignmentView>;
  quantitiesComplete: boolean;
  parseVersion: string;
};

export type VolunteerStatsSummary = {
  totalSpots: number | null;
  filledSpots: number | null;
  openSpots: number | null;
  overallFilledPercent: number | null;
  fullAssignmentCount: number;
  needsHelpCount: number;
  nearlyFullCount: number;
  unknownAssignmentCount: number;
  assignmentCount: number;
  quantitiesComplete: boolean;
};

export type VolunteerSourceRecord = {
  id: string;
  eventId: string;
  organizationId: string;
  provider: VolunteerProvider;
  sourceUrl: string;
  status: VolunteerSourceStatus;
  syncStatus: VolunteerSyncStatus;
  syncError: string | null;
  connectedAt: string | null;
  lastSyncAttemptAt: string | null;
  lastSuccessfulSyncAt: string | null;
  lastFailedSyncAt: string | null;
  nextScheduledSyncAt: string | null;
  latestConfirmedSnapshotId: string | null;
  /**
   * Sticky assignment start-date allowlist (`YYYY-MM-DD` + optional `__none__`).
   * `null` means include all dates (legacy / no filter).
   */
  includedAssignmentDates: string[] | null;
};

export type VolunteerSnapshotRecord = {
  id: string;
  eventId: string;
  sourceId: string;
  capturedAt: string;
  confirmed: boolean;
  sourceTitle: string | null;
  sourceDescription: string | null;
  sourceLocation: string | null;
  signupDeadline: string | null;
  summary: VolunteerStatsSummary;
  assignments: VolunteerAssignmentView[];
};

export type VolunteerSyncAttemptRecord = {
  id: string;
  status: "success" | "error" | "partial";
  errorMessage: string | null;
  assignmentCount: number | null;
  startedAt: string;
  finishedAt: string;
};

export const VOLUNTEER_PARSE_VERSION = "1";
