import Link from "next/link";
import { MondaySettingsShell } from "@/components/monday/MondaySettingsShell";
import { StudioPageHeader } from "@/components/layout/StudioPageHeader";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import {
  formatMondayOAuthError,
  getMondayOAuthCallbackUrl,
} from "@/lib/monday/config";
import { resolveSiteOrigin } from "@/lib/site/url";
import { isMondayIntegrationEnabled } from "@/lib/monday/feature-flag";
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
    return getMondayOAuthCallbackUrl(resolveSiteOrigin());
  } catch (error) {
    console.error("Monday OAuth callback URL resolution failed:", error);
    return "https://heyralli.com/api/monday/oauth/callback";
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
  if (!isMondayIntegrationEnabled()) {
    return (
      <div className="studio-page mx-auto max-w-2xl space-y-8 pb-12">
        <StudioPageHeader
          backHref="/settings"
          title="Monday"
          description="Monday integration is paused while Task Hub runs on Hey Ralli-native tasks."
          eyebrow="Configure"
        />
        <Card>
          <CardHeader>
            <CardTitle>Integration temporarily disabled</CardTitle>
            <CardDescription>
              Use Task Hub at{" "}
              <Link href="/tasks" className="text-cos-primary underline-offset-2 hover:underline">
                /tasks
              </Link>{" "}
              for playbook checklists grouped by committee. Monday sync will return when the
              integration is re-enabled.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

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
