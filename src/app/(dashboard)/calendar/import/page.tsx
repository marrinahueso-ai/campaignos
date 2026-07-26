import { redirect } from "next/navigation";

export const metadata = {
  title: "Import Calendar",
};

/** Canonical import UX lives on Calendar → Import tab. */
export default function CalendarImportPage() {
  redirect("/calendar?tab=import");
}
