import { redirect } from "next/navigation";

export default function LegacyPlaybooksSettingsPage() {
  redirect("/settings/playbooks-milestones");
}
