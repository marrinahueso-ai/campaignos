export type InboxAiSourceType = "events" | "calendar" | "resources" | "faq" | "custom";

export interface OrganizationInboxAiSource {
  id: string;
  organizationId: string;
  label: string;
  url: string;
  sourceType: InboxAiSourceType;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface OrganizationInboxAiSourceRow {
  id: string;
  organization_id: string;
  label: string;
  url: string;
  source_type: InboxAiSourceType;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface OrganizationInboxAiUrlSettings {
  eventsUrl: string | null;
  calendarUrl: string | null;
  resourcesUrl: string | null;
  faqUrl: string | null;
}

export interface InboxAiSourceCheckRecord {
  label: string;
  url: string;
  sourceType: InboxAiSourceType;
  checked: boolean;
  fetchError?: string | null;
  answerFound: boolean;
}

export interface InboxAiSourceUsed {
  sourcesChecked: InboxAiSourceCheckRecord[];
  answerFrom: {
    label: string;
    url: string;
    excerpt: string;
  } | null;
  noAnswerFound: boolean;
}

export interface InboxAiSourcesSettingsInput {
  eventsUrl: string;
  calendarUrl: string;
  resourcesUrl: string;
  faqUrl: string;
  customSources: Array<{
    id?: string;
    label: string;
    url: string;
  }>;
}
