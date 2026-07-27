import { SettingsEaseCalendar } from "@/components/settings-v2/SettingsEaseCalendar";
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

  let bannerMessage: string | null = null;
  let bannerTone: "success" | "error" | null = null;

  if (params.connected === "1") {
    bannerTone = "success";
    if (params.synced === "1") {
      bannerMessage = params.skipped
        ? `You're connected and up to date — ${params.skipped} event${params.skipped === "1" ? "" : "s"} already on the calendar.`
        : "You're connected and up to date. No new events to review.";
    } else if (params.needs_school_year === "1") {
      bannerMessage =
        "You're connected. Set an active school year, then sync to pull events into review.";
    } else if (params.sync_error) {
      bannerMessage =
        "You're connected. Sync couldn't finish — try Sync calendar below.";
      bannerTone = "error";
    } else {
      bannerMessage =
        "You're connected. Sync pulls new events into review; daily sync keeps the calendar fresh.";
    }
  }

  return (
    <SettingsEaseCalendar
      connected={googleConnected}
      integrationConfigured={integrationConfigured}
      accountEmail={connection?.googleAccountEmail ?? null}
      hasActiveSchoolYear={Boolean(activeSchoolYear)}
      activeSchoolYearId={activeSchoolYear?.id ?? null}
      initialSubscribeUrl={activeSchoolYear?.calendarSubscribeUrl ?? ""}
      oauthError={params.error ?? null}
      bannerMessage={bannerMessage}
      bannerTone={bannerTone}
    />
  );
}
