import { PostingScheduleSettingsContent } from "@/components/settings-v2/PostingScheduleSettingsContent";
import { getPostingPreferencesSettingsData } from "@/lib/organizations/posting-preferences-actions";
import { getLatestOrganization } from "@/lib/organizations/queries";

export const metadata = {
  title: "Posting Schedule",
};

export default async function PostingScheduleSettingsPage() {
  const [data, organization] = await Promise.all([
    getPostingPreferencesSettingsData(),
    getLatestOrganization(),
  ]);

  return (
    <PostingScheduleSettingsContent
      organization={organization}
      hasPreferences={Boolean(data)}
    />
  );
}
