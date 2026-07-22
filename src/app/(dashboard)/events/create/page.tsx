import { CreateEventForm } from "@/components/events/CreateEventForm";
import { OnboardingProgress } from "@/components/onboarding/OnboardingProgress";
import { getLatestOrganization } from "@/lib/organizations/queries";
import { getPlaybooksForOrganization } from "@/lib/playbooks/queries";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Create your first event",
};

interface CreateEventPageProps {
  searchParams: Promise<{ onboarding?: string }>;
}

export default async function CreateEventPage({
  searchParams,
}: CreateEventPageProps) {
  const params = await searchParams;
  const onboarding =
    params.onboarding === "1" || params.onboarding === "true";
  const organization = await getLatestOrganization();

  if (onboarding && !organization) {
    redirect("/onboarding");
  }

  const playbooks = await getPlaybooksForOrganization(organization?.id ?? null);
  const playbookOptions = playbooks.map((playbook) => ({
    id: playbook.id,
    name: playbook.name,
    eventType: playbook.eventType,
  }));

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      {onboarding ? <OnboardingProgress current="event" /> : null}
      <div>
        <h1 className="text-2xl font-bold text-cos-text">
          {onboarding ? "Create your first event" : "Create campaign"}
        </h1>
        <p className="mt-1 text-sm text-cos-muted">
          {onboarding
            ? "Add a title and date — you can refine everything after save."
            : "Add a new campaign and get its communications ready."}
        </p>
      </div>

      <CreateEventForm
        playbookOptions={playbookOptions}
        onboarding={onboarding}
      />
    </div>
  );
}
