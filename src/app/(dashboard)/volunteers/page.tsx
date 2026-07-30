import { Suspense } from "react";
import { VolunteersMasterShell } from "@/components/volunteers/VolunteersMasterShell";
import { getVolunteersMasterPageData } from "@/lib/event-volunteers/org-master";

export const metadata = {
  title: "Volunteers",
};

async function VolunteersPageContent() {
  const data = await getVolunteersMasterPageData();

  return <VolunteersMasterShell data={data} />;
}

export default function VolunteersPage() {
  return (
    <Suspense
      fallback={
        <div className="studio-page p-8 text-sm text-cos-muted">
          Loading volunteers…
        </div>
      }
    >
      <VolunteersPageContent />
    </Suspense>
  );
}
