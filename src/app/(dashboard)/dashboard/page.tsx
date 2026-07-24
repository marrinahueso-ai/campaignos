import { Suspense } from "react";
import { OnboardingChecklistCards } from "@/components/onboarding/OnboardingChecklistCards";
import {
  DashboardOverview,
  type DashboardWidgetNodes,
} from "@/components/today/DashboardOverview";
import { TodayHero } from "@/components/today/TodayHero";
import { UpNextWidgetSuspense } from "@/components/today/UpNextWidgetSuspense";
import { AttentionWidget } from "@/components/today/widgets/AttentionWidget";
import { CalendarWidget } from "@/components/today/widgets/CalendarWidget";
import { GoodNewsWidget } from "@/components/today/widgets/GoodNewsWidget";
import { ThisWeekWidget } from "@/components/today/widgets/ThisWeekWidget";
import { WaitingOnMeWidget } from "@/components/today/widgets/WaitingOnMeWidget";
import { WeatherWidget } from "@/components/today/widgets/WeatherWidget";
import { EmptyState } from "@/components/ui/EmptyState";
import { getOnboardingChecklistForCurrentOrg } from "@/lib/onboarding/actions";
import { checklistNeedsAttention } from "@/lib/onboarding/state";
import { getLatestOrganization } from "@/lib/organizations/queries";
import { getDashboardLayoutForCurrentUser } from "@/lib/today/dashboard-layout";
import { getTodayAttentionCounts } from "@/lib/today/attention-counts";
import { getTodayPageData } from "@/lib/today/queries";
import { getTodayDateString } from "@/lib/utils/dates";
import { getTodayWeatherContext } from "@/lib/weather/queries";
import type { Organization } from "@/types";
import type { TodayAttentionCounts, TodayWeekEntry } from "@/types/today";
import type { TodayWeatherContext } from "@/lib/weather/types";
import { GraduationCap } from "lucide-react";

export const metadata = {
  title: "Dashboard",
  description:
    "Your Hey Ralli today view — next campaign actions and the week ahead.",
  alternates: {
    canonical: "/dashboard",
  },
  robots: {
    index: false,
    follow: false,
  },
};

const WEATHER_PLACEHOLDER: TodayWeatherContext = {
  location: null,
  weather: null,
  displayLine: "Local weather unavailable",
};

const ATTENTION_PLACEHOLDER: TodayAttentionCounts = {
  reviewCount: 0,
  volunteerCount: 0,
  tasksThisWeekCount: 0,
};

async function DashboardOnboardingBlock() {
  const onboardingChecklist = await getOnboardingChecklistForCurrentOrg();
  if (
    !onboardingChecklist?.show ||
    !checklistNeedsAttention(onboardingChecklist.items)
  ) {
    return null;
  }
  return <OnboardingChecklistCards items={onboardingChecklist.items} />;
}

async function AttentionWidgetBlock() {
  const counts = await getTodayAttentionCounts();
  return <AttentionWidget counts={counts} />;
}

async function WeatherWidgetBlock({ organization }: { organization: Organization }) {
  const weatherContext = await getTodayWeatherContext(organization);
  return <WeatherWidget weather={weatherContext} />;
}

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

  const [todayData, layout] = await Promise.all([
    getTodayPageData(organization),
    getDashboardLayoutForCurrentUser(),
  ]);
  const today = getTodayDateString();

  // Always mount Phase 1 widgets so Add can show them without a refresh.
  const widgets: DashboardWidgetNodes = {
    up_next: (
      <UpNextWidgetSuspense
        whatsNext={todayData.whatsNext}
        organizationName={organization.name}
      />
    ),
    attention: (
      <Suspense fallback={<AttentionWidget counts={ATTENTION_PLACEHOLDER} />}>
        <AttentionWidgetBlock />
      </Suspense>
    ),
    waiting_me: <WaitingOnMeWidget items={todayData.waitingOnMe} />,
    good_news: <GoodNewsWidget goodNews={todayData.goodNews} />,
    weather: (
      <Suspense fallback={<WeatherWidget weather={WEATHER_PLACEHOLDER} />}>
        <WeatherWidgetBlock organization={organization} />
      </Suspense>
    ),
    calendar: (
      <CalendarWidget today={today} monthEvents={todayData.monthEvents} />
    ),
    this_week: (
      <ThisWeekWidget
        today={today}
        weekEntries={todayData.thisWeek as TodayWeekEntry[]}
      />
    ),
  };

  return (
    <div className="studio-page pb-12">
      <TodayHero
        firstName={todayData.firstName}
        attentionCount={todayData.attentionCount}
        teammateNote={todayData.teammateNote}
        timezone={organization.timezone ?? "America/Chicago"}
      />

      <div className="mt-8 space-y-6 lg:mt-10">
        <Suspense fallback={null}>
          <DashboardOnboardingBlock />
        </Suspense>

        <DashboardOverview initialLayout={layout} widgets={widgets} />
      </div>
    </div>
  );
}
