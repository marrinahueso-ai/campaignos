export type VolunteerOpsSubjectType = "participant" | "item";
export type VolunteerOpsStatus = "arrived" | "received";

export type VolunteerOpsMark = {
  subjectType: VolunteerOpsSubjectType;
  subjectKey: string;
  status: VolunteerOpsStatus;
  markedAt: string;
};

export function participantOpsKey(
  assignmentExternalKey: string,
  participantKey: string,
): string {
  return `${assignmentExternalKey}:${participantKey}`;
}
