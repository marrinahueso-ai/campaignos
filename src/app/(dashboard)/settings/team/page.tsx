import { redirect } from "next/navigation";

export default function LegacyTeamSettingsPage() {
  redirect("/settings/team-access");
}
