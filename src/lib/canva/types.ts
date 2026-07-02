export interface CanvaConnectionRow {
  id: string;
  organization_id: string;
  access_token: string;
  refresh_token: string;
  token_expires_at: string;
  scopes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CanvaConnection {
  id: string;
  organizationId: string;
  accessToken: string;
  refreshToken: string;
  tokenExpiresAt: string;
  scopes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CanvaDesignSummary {
  id: string;
  title: string;
  thumbnailUrl: string | null;
  updatedAt: number | null;
  editUrl: string | null;
}

export interface CanvaTokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  scope?: string;
}

export interface CanvaListDesignsResponse {
  items?: Array<{
    id: string;
    title?: string;
    updated_at?: number;
    thumbnail?: { url?: string };
    urls?: { edit_url?: string; view_url?: string };
  }>;
  continuation?: string;
}

export interface CanvaExportJobResponse {
  job?: {
    id: string;
    status: "in_progress" | "success" | "failed";
    urls?: string[];
    error?: { code?: string; message?: string };
  };
}
