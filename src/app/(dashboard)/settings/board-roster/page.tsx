import { redirect } from "next/navigation";

export default function BoardRosterRedirectPage() {
  redirect("/settings/team-access");
}
