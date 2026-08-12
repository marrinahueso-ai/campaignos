import { notFound, redirect } from "next/navigation";

import { FlyerChangesRequestedShell } from "@/components/flyers/FlyerChangesRequestedShell";
import { getCurrentOrganization } from "@/lib/auth/organization-context";
import { getEventById } from "@/lib/events/queries";
import { flyerComposerEditHref, flyerReviewHref } from "@/lib/flyer-composer/approval";
import { getFlyerById } from "@/lib/flyers/queries";

type ChangesPageProps = {
  params: Promise<{ flyerId: string }>;
};

export async function generateMetadata({ params }: ChangesPageProps) {
  const { flyerId } = await params;
  const organization = await getCurrentOrganization();
  if (!organization) return { title: "Changes requested" };
  const flyer = await getFlyerById(organization.id, flyerId);
  return {
    title: flyer
      ? `Changes — ${flyer.title?.trim() || "Flyer"}`
      : "Changes requested",
  };
}

export default async function FlyerChangesPage({ params }: ChangesPageProps) {
  const { flyerId } = await params;
  const organization = await getCurrentOrganization();

  if (!organization) {
    return (
      <div className="studio-page space-y-4">
        <p className="text-sm text-cos-muted">Sign in to view this flyer.</p>
      </div>
    );
  }

  const flyer = await getFlyerById(organization.id, flyerId);
  if (!flyer) notFound();

  if (flyer.status === "draft") {
    redirect(flyerComposerEditHref({ flyerId: flyer.id }));
  }
  if (flyer.status === "needs_approval" || flyer.status === "approved") {
    redirect(flyerReviewHref(flyer.id));
  }

  const event = flyer.eventId ? await getEventById(flyer.eventId) : null;

  return (
    <FlyerChangesRequestedShell
      flyer={flyer}
      event={
        event
          ? {
              id: event.id,
              title: event.title,
              date: event.date ?? null,
            }
          : null
      }
    />
  );
}
