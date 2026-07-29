import { PlaybooksMilestonesContent } from "@/components/settings-v2/PlaybooksMilestonesContent";
import { getLatestOrganization } from "@/lib/organizations/queries";
import { getPlaybooksForOrganization } from "@/lib/playbooks/queries";

export const metadata = {
  title: "Communication Plans",
};

export default async function PlaybooksMilestonesSettingsPage() {
  const organization = await getLatestOrganization();
  const playbooks = await getPlaybooksForOrganization(organization?.id ?? null);

  return <PlaybooksMilestonesContent playbooks={playbooks} />;
}
