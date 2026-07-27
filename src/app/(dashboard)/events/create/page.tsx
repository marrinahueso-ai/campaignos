import { CreateEventForm } from "@/components/events/CreateEventForm";
import { OnboardingCreateEventEase } from "@/components/onboarding/OnboardingCreateEventEase";
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

  if (onboarding) {
    return (
      <OnboardingCreateEventEase
        organizationName={organization?.name ?? ""}
        playbookOptions={playbookOptions}
      />
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-cos-text">Create campaign</h1>
        <p className="mt-1 text-sm text-cos-muted">
          Add a new campaign and get its communications ready.
        </p>
      </div>

      <CreateEventForm playbookOptions={playbookOptions} />
    </div>
  );
}
