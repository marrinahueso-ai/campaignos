import { notFound } from "next/navigation";

import { NewsletterStatusShell } from "@/components/newsletters/NewsletterStatusShell";
import { accessHasPermission, getEffectiveAccess } from "@/lib/access-templates/effective-access";
import { getOrganizationUsers } from "@/lib/auth/membership-queries";
import { getCurrentOrganization } from "@/lib/auth/organization-context";
import { listNewsletterAudienceMemberIds } from "@/lib/newsletter/audiences";
import { getNewsletterDetailPayload } from "@/lib/newsletter/queries";
import { resolveApprovalAssignee } from "@/lib/organization-workspace/resolve-approval-assignee";

interface NewsletterDetailPageProps {
  params: Promise<{ newsletterId: string }>;
}

export async function generateMetadata({ params }: NewsletterDetailPageProps) {
  const { newsletterId } = await params;
  const organization = await getCurrentOrganization();
  if (!organization) return { title: "Newsletter" };
  const payload = await getNewsletterDetailPayload(organization.id, newsletterId);
  return { title: payload ? `${payload.newsletter.title} — Newsletter` : "Newsletter" };
}

export default async function NewsletterDetailPage({ params }: NewsletterDetailPageProps) {
  const { newsletterId } = await params;
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

  const [payload, access, members, assignee] = await Promise.all([
    getNewsletterDetailPayload(organization.id, newsletterId),
    getEffectiveAccess(),
    getOrganizationUsers(organization.id),
    resolveApprovalAssignee(organization.id, null),
  ]);

  if (!payload) {
    notFound();
  }

  const nameByAuthUserId = new Map<string, string>();
  for (const member of members) {
    if (!member.userId) continue;
    nameByAuthUserId.set(
      member.userId,
      member.displayName?.trim() || member.email?.trim() || member.username || "Teammate",
    );
  }
  const resolveName = (authUserId: string | null): string | null =>
    authUserId ? nameByAuthUserId.get(authUserId) ?? null : null;

  const canEditDraft = access ? accessHasPermission(access, "draft_edit") : false;

  const audience =
    payload.approvedAudience ?? payload.proposedAudience ?? null;
  const audienceCount = audience
    ? (await listNewsletterAudienceMemberIds(organization.id, audience.id)).length
    : null;

  // Draft / changes_requested: show the live composer draft.
  // Approved+ pipeline: prefer the frozen approved/current version snapshot.
  const previewState =
    payload.newsletter.status === "draft" ||
    payload.newsletter.status === "changes_requested"
      ? payload.newsletter.composerState
      : payload.newsletter.status === "approved" ||
          payload.newsletter.status === "scheduled" ||
          payload.newsletter.status === "sending" ||
          payload.newsletter.status === "sent" ||
          payload.newsletter.status === "failed"
        ? payload.approvedVersion?.snapshot ??
          payload.currentVersion?.snapshot ??
          payload.newsletter.composerState
        : payload.newsletter.composerState;

  return (
    <NewsletterStatusShell
      newsletter={payload.newsletter}
      previewState={previewState}
      audience={audience}
      audienceCount={audienceCount}
      creatorName={resolveName(payload.newsletter.createdBy)}
      submittedByName={resolveName(payload.newsletter.submittedBy)}
      approvedByName={resolveName(payload.newsletter.approvedBy)}
      sentByName={resolveName(payload.newsletter.sentBy)}
      approverName={
        assignee.hasAssignedPerson ? assignee.assigneeDisplayName : null
      }
      canEditDraft={canEditDraft}
    />
  );
}
