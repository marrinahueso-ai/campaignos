import { redirect } from "next/navigation";

export default function OrganizationBoardRosterRedirectPage() {
  redirect("/settings/team-access");
}
