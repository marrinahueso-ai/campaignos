import { notFound } from "next/navigation";

import { FlyerApproverReviewShell } from "@/components/flyers/FlyerApproverReviewShell";
import { hasPermission } from "@/lib/access-templates/effective-access";
import { getOrganizationUsers } from "@/lib/auth/membership-queries";
import { getAuthUser } from "@/lib/auth/queries";
import { getCurrentOrganization } from "@/lib/auth/organization-context";
import { getEventById } from "@/lib/events/queries";
import { getFlyerById } from "@/lib/flyers/queries";

type ReviewPageProps = {
  params: Promise<{ flyerId: string }>;
};

export async function generateMetadata({ params }: ReviewPageProps) {
  const { flyerId } = await params;
  const organization = await getCurrentOrganization();
  if (!organization) return { title: "Flyer review" };
  const flyer = await getFlyerById(organization.id, flyerId);
  return {
    title: flyer
      ? `Review — ${flyer.title?.trim() || "Flyer"}`
      : "Flyer review",
  };
}

export default async function FlyerReviewPage({ params }: ReviewPageProps) {
  const { flyerId } = await params;
  const organization = await getCurrentOrganization();

  if (!organization) {
    return (
      <div className="studio-page space-y-4">
        <p className="text-sm text-cos-muted">Sign in to review this flyer.</p>
      </div>
    );
  }

  const [flyer, authUser, members, canApprove] = await Promise.all([
    getFlyerById(organization.id, flyerId),
    getAuthUser(),
    getOrganizationUsers(organization.id),
    hasPermission("approve_comms"),
  ]);

  if (!flyer) notFound();

  const event = flyer.eventId
    ? await getEventById(flyer.eventId)
    : null;

  const nameByAuthUserId = new Map<string, string>();
  for (const member of members) {
    if (!member.userId) continue;
    nameByAuthUserId.set(
      member.userId,
      member.displayName?.trim() || member.email?.trim() || "Teammate",
    );
  }

  const submittedByName = flyer.submittedBy
    ? nameByAuthUserId.get(flyer.submittedBy) ?? null
    : flyer.createdBy
      ? nameByAuthUserId.get(flyer.createdBy) ?? null
      : null;

  const currentUserId = authUser?.id ?? null;
  const isCreatorViewing = Boolean(
    currentUserId &&
      (currentUserId === flyer.createdBy ||
        currentUserId === flyer.submittedBy),
  );

  return (
    <FlyerApproverReviewShell
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
      submittedByName={submittedByName}
      canApprove={canApprove}
      isCreatorViewing={isCreatorViewing}
    />
  );
}
