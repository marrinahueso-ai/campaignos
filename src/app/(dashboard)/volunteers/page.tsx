import { Suspense } from "react";
import { VolunteersMasterShell } from "@/components/volunteers/VolunteersMasterShell";
import { getVolunteersMasterPageData } from "@/lib/event-volunteers/org-master";

export const metadata = {
  title: "Volunteers",
};

export default async function VolunteersPage() {
  const data = await getVolunteersMasterPageData();

  return (
    <Suspense
      fallback={
        <div className="studio-page p-8 text-sm text-cos-muted">
          Loading volunteers…
        </div>
      }
    >
      <VolunteersMasterShell data={data} />
    </Suspense>
  );
}
