import { Suspense } from "react";
import { VolunteersMasterShell } from "@/components/volunteers/VolunteersMasterShell";
import { getVolunteersMasterPageData } from "@/lib/event-volunteers/org-master";
import { getVolunteersMasterLayoutForCurrentUser } from "@/lib/event-volunteers/volunteers-master-layout-queries";

export const metadata = {
  title: "Volunteers",
};

export default async function VolunteersPage() {
  const [data, initialKpiLayout] = await Promise.all([
    getVolunteersMasterPageData(),
    getVolunteersMasterLayoutForCurrentUser(),
  ]);

  return (
    <Suspense
      fallback={
        <div className="studio-page p-8 text-sm text-cos-muted">
          Loading volunteers…
        </div>
      }
    >
      <VolunteersMasterShell
        data={data}
        initialKpiLayout={initialKpiLayout}
      />
    </Suspense>
  );
}
