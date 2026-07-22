import { OnboardingChecklistCards } from "@/components/onboarding/OnboardingChecklistCards";
import { TodayCompanionSection } from "@/components/today/TodayCompanionSection";
import { TodayHero } from "@/components/today/TodayHero";
import { TodayPulseSection } from "@/components/today/TodayPulseSection";
import { TodaySnapshot } from "@/components/today/TodaySnapshot";
import { WhatsNextSectionSuspense } from "@/components/today/WhatsNextSectionSuspense";
import { EmptyState } from "@/components/ui/EmptyState";
import { getApprovalQueueForCurrentUser } from "@/lib/event-workspace/approval-routing-queries";
import { getOnboardingChecklistForCurrentOrg } from "@/lib/onboarding/actions";
import { checklistNeedsAttention } from "@/lib/onboarding/state";
import { getLatestOrganization } from "@/lib/organizations/queries";
import { getTodayPageData } from "@/lib/today/queries";
import { getTodayDateString } from "@/lib/utils/dates";
import { getTodayWeatherContext } from "@/lib/weather/queries";
import { GraduationCap } from "lucide-react";

export const metadata = {
  title: "Dashboard",
  description:
    "Your Hey Ralli today view — next campaign actions, approvals, and the week ahead.",
  alternates: {
    canonical: "/dashboard",
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default async function DashboardPage() {
  const organization = await getLatestOrganization();

  if (!organization) {
    return (
      <div className="studio-page pb-12">
        <EmptyState
          icon={GraduationCap}
          title="Welcome to Hey Ralli"
          description="Create your first event in under a minute — calendar, brand, and team can wait."
          action={{
            label: "Create my first event",
            href: "/onboarding",
          }}
          className="cos-card py-20"
        />
      </div>
    );
  }

  const [todayData, weatherContext, approvalQueue, onboardingChecklist] =
    await Promise.all([
      getTodayPageData(organization),
      getTodayWeatherContext(organization),
      getApprovalQueueForCurrentUser(),
      getOnboardingChecklistForCurrentOrg(),
    ]);

  const today = getTodayDateString();
  const recentPublished = todayData.goodNews.items.filter(
    (item) => item.kind === "published",
  );

  return (
    <div className="studio-page pb-12">
      <div className="flex flex-col lg:flex-row lg:items-start lg:gap-x-10">
        <div className="min-w-0 flex-1 lg:max-w-[calc((100%-2.5rem)*8/12)]">
          <TodayHero
            firstName={todayData.firstName}
            attentionCount={todayData.attentionCount}
            teammateNote={todayData.teammateNote}
            timezone={organization?.timezone ?? "America/Chicago"}
          />
          <div className="mt-6 flex flex-col gap-8 lg:mt-7 lg:gap-10">
            {onboardingChecklist?.show &&
            checklistNeedsAttention(onboardingChecklist.items) ? (
              <OnboardingChecklistCards items={onboardingChecklist.items} />
            ) : null}
            <WhatsNextSectionSuspense whatsNext={todayData.whatsNext} />
            <TodayPulseSection
              pendingApprovals={approvalQueue.assignedToMe}
              totalPendingCount={approvalQueue.allPending.length}
              recentPublished={recentPublished}
            />
            <TodayCompanionSection
              whatsNext={todayData.whatsNext}
              waitingOnMe={todayData.waitingOnMe}
              waitingOnOthers={todayData.waitingOnOthers}
            />
          </div>
        </div>

        <div className="mt-8 flex w-full flex-col gap-8 lg:mt-0 lg:max-w-sm lg:flex-none lg:basis-[calc((100%-2.5rem)*4/12)] lg:gap-10">
          <TodaySnapshot
            today={today}
            weather={weatherContext}
            weekEntries={todayData.thisWeek}
          />
          {todayData.goodNews.fallbackMessage && recentPublished.length === 0 && (
            <p className="text-sm leading-relaxed text-cos-muted">
              {todayData.goodNews.fallbackMessage}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
