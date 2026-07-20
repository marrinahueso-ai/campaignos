import Link from "next/link";
import { Suspense } from "react";
import { CalendarSubscribeFeedSection } from "@/components/calendar-import/CalendarSubscribeFeedSection";
import {
  GoogleCalendarConnectedBadge,
  GoogleCalendarConnectionPanel,
} from "@/components/google-calendar/GoogleCalendarConnectionPanel";
import { StudioPageHeader } from "@/components/layout/StudioPageHeader";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import {
  getGoogleCalendarConnectionForCurrentOrg,
  isGoogleCalendarConnectionConfigured,
} from "@/lib/google-calendar/connection";
import { isGoogleCalendarIntegrationConfigured } from "@/lib/google-calendar/config";
import { getLatestOrganization } from "@/lib/organizations/queries";
import { getActiveSchoolYear } from "@/lib/school-years/queries";

export const metadata = {
  title: "Google Calendar · Integrations",
};

interface CalendarIntegrationPageProps {
  searchParams: Promise<{
    connected?: string;
    synced?: string;
    skipped?: string;
    sync_error?: string;
    needs_school_year?: string;
    error?: string;
  }>;
}

export default async function CalendarIntegrationPage({
  searchParams,
}: CalendarIntegrationPageProps) {
  const params = await searchParams;
  const [organization, connection] = await Promise.all([
    getLatestOrganization(),
    getGoogleCalendarConnectionForCurrentOrg(),
  ]);
  const activeSchoolYear = organization
    ? await getActiveSchoolYear(organization.id)
    : null;

  const googleConnected = isGoogleCalendarConnectionConfigured(connection);
  const integrationConfigured = isGoogleCalendarIntegrationConfigured();
  const hasSubscribe = Boolean(activeSchoolYear?.calendarSubscribeUrl?.trim());

  return (
    <div className="studio-page mx-auto max-w-xl space-y-8 pb-12">
      <StudioPageHeader
        backHref="/settings/integrations"
        title="Google Calendar"
        description={
          googleConnected
            ? `Connected for ${organization?.name ?? "your organization"}.`
            : `Add your school calendar. Sign in with Google, use a subscribe link, or upload a file.`
        }
        eyebrow="Integrations"
      />

      {params.connected === "1" ? (
        <p className="text-sm text-emerald-700" role="status">
          {params.synced === "1"
            ? params.skipped
              ? `You're connected and up to date — ${params.skipped} event${params.skipped === "1" ? "" : "s"} already on the calendar.`
              : "You're connected and up to date. No new events to review."
            : params.needs_school_year === "1"
              ? "You're connected. Set an active school year, then sync to pull events into review."
              : params.sync_error
                ? "You're connected. Sync couldn't finish — try Sync calendar below."
                : "You're connected. Sync pulls new events into review; daily sync keeps the calendar fresh."}
        </p>
      ) : null}

      <Card>
        <CardHeader>
          {googleConnected ? (
            <GoogleCalendarConnectedBadge />
          ) : (
            <CardTitle>Sign in with Google</CardTitle>
          )}
          {!googleConnected ? (
            <CardDescription>
              One click. Approve calendar access. Sync events into Hey Ralli.
            </CardDescription>
          ) : null}
        </CardHeader>
        <div className="px-6 pb-6">
          <GoogleCalendarConnectionPanel
            connected={googleConnected}
            integrationConfigured={integrationConfigured}
            accountEmail={connection?.googleAccountEmail ?? null}
            hasActiveSchoolYear={Boolean(activeSchoolYear)}
            oauthError={params.error ?? null}
            justConnected={params.connected === "1"}
          />
        </div>
      </Card>

      <details className="rounded-xl border border-cos-border bg-cos-card px-5 py-4">
        <summary className="cursor-pointer text-sm font-medium text-cos-text">
          Other ways to import
          {hasSubscribe ? (
            <span className="ml-2 inline-flex align-middle">
              <Badge variant="success">Subscribe link saved</Badge>
            </span>
          ) : null}
        </summary>
        <div className="mt-4 space-y-6 border-t border-cos-border pt-4">
          <div>
            <h3 className="text-sm font-medium text-cos-text">Subscribe link</h3>
            <p className="mt-1 text-sm text-cos-muted">
              Paste a Google Calendar ICS or webcal URL. We refresh it daily.
            </p>
            <div className="mt-3">
              <Suspense
                fallback={
                  <p className="text-sm text-cos-muted">Loading subscribe feed…</p>
                }
              >
                <CalendarSubscribeFeedSection variant="plain" />
              </Suspense>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium text-cos-text">Upload a file</h3>
            <p className="mt-1 text-sm text-cos-muted">
              One-time ICS, PDF, or spreadsheet import.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button href="/calendar/import" size="sm" variant="secondary">
                Upload calendar file
              </Button>
              <Button href="/calendar/review" size="sm" variant="ghost">
                Review imports
              </Button>
            </div>
          </div>
        </div>
      </details>

      <p className="text-sm text-cos-muted">
        <Link
          href="/settings/integrations"
          className="font-medium text-cos-text hover:underline"
        >
          Back to Integrations
        </Link>
      </p>
    </div>
  );
}
