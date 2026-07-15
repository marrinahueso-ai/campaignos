import { CreateEventForm } from "@/components/events/CreateEventForm";
import { getLatestOrganization } from "@/lib/organizations/queries";
import { getPlaybooksForOrganization } from "@/lib/playbooks/queries";

export const metadata = {
  title: "Create campaign",
};

export default async function CreateEventPage() {
  const organization = await getLatestOrganization();
  const playbooks = await getPlaybooksForOrganization(organization?.id ?? null);
  const playbookOptions = playbooks.map((playbook) => ({
    id: playbook.id,
    name: playbook.name,
    eventType: playbook.eventType,
  }));

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
