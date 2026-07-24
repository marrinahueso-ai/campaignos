import { Suspense } from "react";
import { OnboardingChecklistCards } from "@/components/onboarding/OnboardingChecklistCards";
import { DashboardOverview } from "@/components/today/DashboardOverview";
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
import { DEFAULT_DASHBOARD_LAYOUT } from "@/lib/today/dashboard-widgets";
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
  const resolvedLayout = layout ?? DEFAULT_DASHBOARD_LAYOUT;

  const mainWidgets = resolvedLayout.main.map((id) => {
    switch (id) {
      case "up_next":
        return (
          <UpNextWidgetSuspense
            key={id}
            whatsNext={todayData.whatsNext}
            organizationName={organization.name}
          />
        );
      case "attention":
        return (
          <Suspense key={id} fallback={<AttentionWidget counts={ATTENTION_PLACEHOLDER} />}>
            <AttentionWidgetBlock />
          </Suspense>
        );
      case "waiting_me":
        return <WaitingOnMeWidget key={id} items={todayData.waitingOnMe} />;
      case "good_news":
        return <GoodNewsWidget key={id} goodNews={todayData.goodNews} />;
      default:
        return null;
    }
  });

  const railWidgets = resolvedLayout.rail.map((id) => {
    switch (id) {
      case "weather":
        return (
          <Suspense key={id} fallback={<WeatherWidget weather={WEATHER_PLACEHOLDER} />}>
            <WeatherWidgetBlock organization={organization} />
          </Suspense>
        );
      case "calendar":
        return (
          <CalendarWidget
            key={id}
            today={today}
            monthEvents={todayData.monthEvents}
          />
        );
      case "this_week":
        return (
          <ThisWeekWidget
            key={id}
            today={today}
            weekEntries={todayData.thisWeek as TodayWeekEntry[]}
          />
        );
      default:
        return null;
    }
  });

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

        <DashboardOverview
          layout={resolvedLayout}
          main={mainWidgets}
          rail={railWidgets}
        />
      </div>
    </div>
  );
}
