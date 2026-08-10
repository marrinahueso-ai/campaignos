import { notFound } from "next/navigation";

import { NewsletterDetailShell } from "@/components/newsletters/NewsletterDetailShell";
import { accessHasPermission, getEffectiveAccess } from "@/lib/access-templates/effective-access";
import { getOrganizationUsers } from "@/lib/auth/membership-queries";
import { getCurrentOrganization } from "@/lib/auth/organization-context";
import { getNewsletterDetailPayload } from "@/lib/newsletter/queries";

interface NewsletterDetailPageProps {
  params: Promise<{ newsletterId: string }>;
  searchParams: Promise<{ prepare?: string }>;
}

export async function generateMetadata({ params }: NewsletterDetailPageProps) {
  const { newsletterId } = await params;
  const organization = await getCurrentOrganization();
  if (!organization) return { title: "Newsletter" };
  const payload = await getNewsletterDetailPayload(organization.id, newsletterId);
  return { title: payload ? `${payload.newsletter.title} — Newsletter` : "Newsletter" };
}

export default async function NewsletterDetailPage({
  params,
  searchParams,
}: NewsletterDetailPageProps) {
  const { newsletterId } = await params;
  const { prepare } = await searchParams;
  const organization = await getCurrentOrganization();

  if (!organization) {
    return (
      <div className="studio-page space-y-4">
        <p className="text-sm text-cos-muted">
          Sign in and set up your organization to view this newsletter.
        </p>
      </div>
    );
  }

  const [payload, access, members] = await Promise.all([
    getNewsletterDetailPayload(organization.id, newsletterId),
    getEffectiveAccess(),
    getOrganizationUsers(organization.id),
  ]);

  if (!payload) {
    notFound();
  }

  const nameByMembershipId = new Map<string, string>();
  for (const member of members) {
    nameByMembershipId.set(
      member.id,
      member.displayName?.trim() || member.email?.trim() || "Unknown",
    );
  }
  const resolveName = (membershipId: string | null): string | null =>
    membershipId ? nameByMembershipId.get(membershipId) ?? "Unknown" : null;

  const canSendNewsletter = access ? accessHasPermission(access, "send_newsletter") : false;
  const canEditDraft = access ? accessHasPermission(access, "draft_edit") : false;

  const auditEvents = payload.auditEvents.map((event) => ({
    id: event.id,
    eventType: event.event_type,
    detail: event.detail,
    createdAt: event.created_at,
    actorName: resolveName(event.actor_user_id),
  }));

  return (
    <NewsletterDetailShell
      newsletter={payload.newsletter}
      currentVersion={payload.currentVersion}
      approvedVersion={payload.approvedVersion}
      proposedAudience={payload.proposedAudience}
      approvedAudience={payload.approvedAudience}
      audiences={payload.audiences}
      senderProfile={payload.senderProfile}
      auditEvents={auditEvents}
      creatorName={resolveName(payload.newsletter.createdBy)}
      submittedByName={resolveName(payload.newsletter.submittedBy)}
      approvedByName={resolveName(payload.newsletter.approvedBy)}
      sentByName={resolveName(payload.newsletter.sentBy)}
      canSendNewsletter={canSendNewsletter}
      canEditDraft={canEditDraft}
      openPrepareApprovalOnLoad={prepare === "approval"}
    />
  );
}
