import {
  GoogleCalendarConnectedBadge,
  GoogleCalendarConnectionPanel,
} from "@/components/google-calendar/GoogleCalendarConnectionPanel";
import {
  getGoogleCalendarConnectionForCurrentOrg,
  isGoogleCalendarConnectionConfigured,
} from "@/lib/google-calendar/connection";
import { isGoogleCalendarIntegrationConfigured } from "@/lib/google-calendar/config";
import { getLatestOrganization } from "@/lib/organizations/queries";
import { getActiveSchoolYear } from "@/lib/school-years/queries";

export async function GoogleCalendarImportSection() {
  const [organization, connection] = await Promise.all([
    getLatestOrganization(),
    getGoogleCalendarConnectionForCurrentOrg(),
  ]);
  const activeSchoolYear = organization
    ? await getActiveSchoolYear(organization.id)
    : null;
  const connected = isGoogleCalendarConnectionConfigured(connection);

  return (
    <div className="rounded-2xl border border-cos-border bg-white p-6 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <h2 className="font-display text-xl text-cos-text">
          Sign in with Google
        </h2>
        {connected ? <GoogleCalendarConnectedBadge /> : null}
      </div>
      <GoogleCalendarConnectionPanel
        connected={connected}
        integrationConfigured={isGoogleCalendarIntegrationConfigured()}
        accountEmail={connection?.googleAccountEmail ?? null}
        hasActiveSchoolYear={Boolean(activeSchoolYear)}
        returnTo="/calendar/import"
      />
    </div>
  );
}
