import { ReportProblemButton } from "@/components/monitoring/ReportProblemButton";
import { getCurrentCampaignRole } from "@/lib/auth/get-current-role";
import { getActiveMembership } from "@/lib/auth/membership-queries";
import { getAuthUser } from "@/lib/auth/queries";
import { canSeeReportAProblem } from "@/lib/monitoring/report-a-problem-access";
import { getSentryEnvironment } from "@/lib/monitoring/sentry-privacy";

/**
 * Server gate for the shared Report a Problem control.
 * Renders nothing for unauthorized production users.
 */
export async function ReportProblemHost() {
  const [user, membership, role] = await Promise.all([
    getAuthUser(),
    getActiveMembership(),
    getCurrentCampaignRole(),
  ]);

  if (
    !canSeeReportAProblem({
      email: user?.email ?? membership?.user.email ?? null,
      role: membership?.user.campaignRole ?? role,
    })
  ) {
    return null;
  }

  return (
    <ReportProblemButton
      userId={user?.id ?? membership?.user.id ?? null}
      userRole={membership?.user.campaignRole ?? role}
      organizationId={membership?.organizationId ?? null}
      environment={getSentryEnvironment()}
      release={
        process.env.NEXT_PUBLIC_SENTRY_RELEASE ||
        process.env.VERCEL_GIT_COMMIT_SHA ||
        null
      }
    />
  );
}
