import { MondaySettingsShell } from "@/components/monday/MondaySettingsShell";
import {
  formatMondayOAuthError,
  getMondayOAuthCallbackUrl,
} from "@/lib/monday/config";
import { getLatestOrganization } from "@/lib/organizations/queries";

export const metadata = {
  title: "Monday",
};

export const dynamic = "force-dynamic";

interface MondaySettingsPageProps {
  searchParams: Promise<{
    connected?: string | string[];
    error?: string | string[];
    error_description?: string | string[];
  }>;
}

function firstSearchParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function safeOAuthCallbackUrl(): string {
  try {
    return getMondayOAuthCallbackUrl(
      process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
        process.env.NEXT_PUBLIC_APP_URL?.trim() ||
        "http://localhost:3000",
    );
  } catch (error) {
    console.error("Monday OAuth callback URL resolution failed:", error);
    return "https://your-domain/api/monday/oauth/callback";
  }
}

async function safeOrganizationName(): Promise<string | null> {
  try {
    const organization = await getLatestOrganization();
    return organization?.name ?? null;
  } catch (error) {
    console.error("Monday settings organization lookup failed:", error);
    return null;
  }
}

export default async function MondaySettingsPage({ searchParams }: MondaySettingsPageProps) {
  const params = await searchParams;
  const connectedParam = firstSearchParam(params.connected);
  const errorParam = firstSearchParam(params.error);
  const errorDescriptionParam = firstSearchParam(params.error_description);
  const organizationName = await safeOrganizationName();
  const oauthCallbackUrl = safeOAuthCallbackUrl();

  const statusMessage =
    connectedParam === "1"
      ? "Monday connected successfully."
      : errorParam
        ? formatMondayOAuthError(errorParam, errorDescriptionParam)
        : null;

  const statusTone: "success" | "error" | null =
    connectedParam === "1" ? "success" : errorParam ? "error" : null;

  return (
    <MondaySettingsShell
      organizationName={organizationName}
      oauthCallbackUrl={oauthCallbackUrl}
      statusMessage={statusMessage}
      statusTone={statusTone}
      justConnected={connectedParam === "1"}
    />
  );
}
