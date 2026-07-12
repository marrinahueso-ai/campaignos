export type IntegrationId =
  | "canva"
  | "meta"
  | "google-calendar"
  | "google-inbox"
  | "monday"
  | "dropbox"
  | "constant-contact"
  | "signup-genius";

export interface IntegrationStatus {
  id: IntegrationId;
  name: string;
  description: string;
  connected: boolean;
  manageHref: string;
  available: boolean;
  comingSoon?: boolean;
}
