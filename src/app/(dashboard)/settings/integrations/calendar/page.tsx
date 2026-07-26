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
            ? `Connected for ${organization?.name ?? "your organization"}. Manage sync here; file upload and import review are on Calendar → Import.`
            : `Connect Google Calendar or save a subscribe link. Upload a file and review New/Duplicate/Update/Conflict on Calendar → Import.`
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

      <div className="rounded-[22px] border border-cos-border bg-[rgba(255,252,247,0.55)] px-5 py-4">
        <p className="text-[11px] font-extrabold tracking-[0.08em] text-cos-muted uppercase">
          Same doorway as Calendar
        </p>
        <p className="mt-2 text-sm leading-relaxed text-cos-muted">
          Subscribe links and file upload walk through on{" "}
          <Link
            href="/calendar?tab=import"
            className="font-bold text-cos-text underline-offset-2 hover:underline"
          >
            Calendar → Import
          </Link>
          , then land on{" "}
          <Link
            href="/calendar?tab=review"
            className="font-bold text-cos-text underline-offset-2 hover:underline"
          >
            Review
          </Link>
          .
          {hasSubscribe ? (
            <span className="mt-2 block">
              <Badge variant="success">Subscribe link saved</Badge>
            </span>
          ) : null}
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
        <div className="mt-4 flex flex-wrap gap-2">
          <Button href="/calendar?tab=import" size="sm" variant="secondary">
            Open Calendar Import
          </Button>
          <Button href="/calendar?tab=review" size="sm" variant="ghost">
            Review latest
          </Button>
        </div>
      </div>

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
