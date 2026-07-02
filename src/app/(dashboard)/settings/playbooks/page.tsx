import Link from "next/link";
import { PlaybookList } from "@/components/playbooks/PlaybookList";
import { Button } from "@/components/ui/Button";
import { getLatestOrganization } from "@/lib/organizations/queries";
import { getPlaybooksForOrganization } from "@/lib/playbooks/queries";

export const metadata = {
  title: "Communication Playbooks",
};

export default async function PlaybooksSettingsPage() {
  const organization = await getLatestOrganization();
  const playbooks = await getPlaybooksForOrganization(organization?.id ?? null);

  return (
    <div className="studio-page space-y-10 pb-12">
      <header className="flex flex-col gap-4 border-b border-cos-border pb-8 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-4">
          <Link
            href="/settings"
            className="inline-flex text-xs font-medium tracking-wide text-cos-muted transition-colors hover:text-cos-text"
          >
            ← Back to Settings
          </Link>
          <div>
            <p className="studio-eyebrow">Configure</p>
            <h1 className="font-display mt-2 text-4xl text-cos-text sm:text-5xl">
              Communication Playbooks
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-cos-muted sm:text-base">
              Create, duplicate, and manage countdown communication plans for every event type.
            </p>
          </div>
        </div>
        <Button href="/settings/playbooks/new" className="shrink-0">
          Create Playbook
        </Button>
      </header>

      <PlaybookList playbooks={playbooks} />
    </div>
  );
}
