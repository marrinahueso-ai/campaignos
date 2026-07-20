export interface GoogleCalendarConnectionRow {
  id: string;
  organization_id: string;
  access_token: string;
  refresh_token: string;
  token_expires_at: string;
  scopes: string | null;
  google_account_email: string | null;
  google_calendar_id: string;
  created_at: string;
  updated_at: string;
}

export interface GoogleCalendarConnection {
  id: string;
  organizationId: string;
  accessToken: string;
  refreshToken: string;
  tokenExpiresAt: string;
  scopes: string | null;
  googleAccountEmail: string | null;
  googleCalendarId: string;
  createdAt: string;
  updatedAt: string;
}

export interface GoogleTokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  scope?: string;
  token_type?: string;
}

export interface GoogleCalendarApiEvent {
  id?: string;
  summary?: string;
  status?: string;
  start?: {
    date?: string;
    dateTime?: string;
  };
}
