import { EventOnboardingPrompt } from "@/components/onboarding/EventOnboardingPrompt";
import { notFound } from "next/navigation";
import { isEventsPhase3UiEnabled } from "@/lib/events/events-phase3-flag";
import { getEventById } from "@/lib/events/queries";

interface EventWorkspacePageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string; onboarding?: string }>;
}

export async function generateMetadata({ params }: EventWorkspacePageProps) {
  const { id } = await params;
  const event = await getEventById(id);

  return {
    title: event
      ? isEventsPhase3UiEnabled()
        ? `${event.title} — Event`
        : `${event.title} — Planning hub`
      : isEventsPhase3UiEnabled()
        ? "Event"
        : "Planning hub",
  };
}

export default async function EventWorkspacePage({
  params,
  searchParams,
}: EventWorkspacePageProps) {
  const { id } = await params;
  const { tab, onboarding } = await searchParams;
  const event = await getEventById(id);

  if (!event) {
    notFound();
  }

  const onboardingStep =
    onboarding === "calendar" ||
    onboarding === "brand" ||
    onboarding === "invite"
      ? onboarding
      : null;

  if (isEventsPhase3UiEnabled()) {
    const { renderEventsPhase3Detail } = await import("./render-events-phase3");
    return (
      <>
        {renderEventsPhase3Detail(event, tab ?? null)}
        {onboardingStep ? (
          <EventOnboardingPrompt step={onboardingStep} />
        ) : null}
      </>
    );
  }

  const { renderPlanningHubDetail } = await import("./render-planning-hub");
  return renderPlanningHubDetail(event, tab ?? null);
}
