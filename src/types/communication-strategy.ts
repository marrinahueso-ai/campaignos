export type CommunicationStrategy =
  | "full_campaign"
  | "reminder_only"
  | "calendar_only"
  | "custom";

export const COMMUNICATION_STRATEGIES: CommunicationStrategy[] = [
  "full_campaign",
  "reminder_only",
  "calendar_only",
  "custom",
];
