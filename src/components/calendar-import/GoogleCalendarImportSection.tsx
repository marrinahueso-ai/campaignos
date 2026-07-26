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
import { cn } from "@/lib/utils/cn";

interface GoogleCalendarImportSectionProps {
  variant?: "default" | "ease";
}

export async function GoogleCalendarImportSection({
  variant = "default",
}: GoogleCalendarImportSectionProps) {
  const [organization, connection] = await Promise.all([
    getLatestOrganization(),
    getGoogleCalendarConnectionForCurrentOrg(),
  ]);
  const activeSchoolYear = organization
    ? await getActiveSchoolYear(organization.id)
    : null;
  const connected = isGoogleCalendarConnectionConfigured(connection);
  const ease = variant === "ease";

  return (
    <div
      className={cn(
        ease
          ? "rounded-[22px] border border-cos-border bg-cos-card p-[22px] shadow-[0_8px_28px_rgba(28,36,48,0.06)]"
          : "rounded-2xl border border-cos-border bg-white p-6 shadow-sm",
      )}
    >
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <h2
          className={cn(
            "font-display text-cos-text",
            ease
              ? "text-[22px] font-semibold tracking-[-0.02em]"
              : "text-xl",
          )}
        >
          Sign in with Google
        </h2>
        {connected ? <GoogleCalendarConnectedBadge /> : null}
      </div>
      <GoogleCalendarConnectionPanel
        connected={connected}
        integrationConfigured={isGoogleCalendarIntegrationConfigured()}
        accountEmail={connection?.googleAccountEmail ?? null}
        hasActiveSchoolYear={Boolean(activeSchoolYear)}
        returnTo="/calendar?tab=import"
        variant={variant}
      />
    </div>
  );
}
