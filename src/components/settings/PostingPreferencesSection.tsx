import { PostingPreferencesPanel } from "@/components/settings/PostingPreferencesPanel";
import { getPostingPreferencesSettingsData } from "@/lib/organizations/posting-preferences-actions";

export async function PostingPreferencesSection() {
  const data = await getPostingPreferencesSettingsData();

  if (!data) {
    return null;
  }

  return <PostingPreferencesPanel initialInput={data.input} />;
}
