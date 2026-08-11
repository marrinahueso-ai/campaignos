import { notFound, redirect } from "next/navigation";

import { NewsletterPreviewSendShell } from "@/components/newsletters/NewsletterPreviewSendShell";
import { accessHasPermission, getEffectiveAccess } from "@/lib/access-templates/effective-access";
import { getCurrentOrganization } from "@/lib/auth/organization-context";
import {
  listNewsletterAudienceMemberIds,
} from "@/lib/newsletter/audiences";
import { getNewsletterDetailPayload } from "@/lib/newsletter/queries";
import { resolveApprovalAssignee } from "@/lib/organization-workspace/resolve-approval-assignee";

interface PreviewPageProps {
  params: Promise<{ newsletterId: string }>;
}

export async function generateMetadata({ params }: PreviewPageProps) {
  const { newsletterId } = await params;
  const organization = await getCurrentOrganization();
  if (!organization) return { title: "Preview & Send" };
  const payload = await getNewsletterDetailPayload(organization.id, newsletterId);
  return {
    title: payload
      ? `Preview — ${payload.newsletter.title || "Newsletter"}`
      : "Preview & Send",
  };
}

export default async function NewsletterPreviewPage({ params }: PreviewPageProps) {
  const { newsletterId } = await params;
  const organization = await getCurrentOrganization();
  if (!organization) {
    return (
      <div className="studio-page space-y-4">
        <p className="text-sm text-cos-muted">Sign in to preview this newsletter.</p>
      </div>
    );
  }

  const [payload, access, assignee] = await Promise.all([
    getNewsletterDetailPayload(organization.id, newsletterId),
    getEffectiveAccess(),
    resolveApprovalAssignee(organization.id, null),
  ]);

  if (!payload) notFound();

  const canEdit = access ? accessHasPermission(access, "draft_edit") : false;
  const canSubmit = access ? accessHasPermission(access, "submit_approval") : false;
  if (!canEdit && !canSubmit) {
    redirect(`/newsletters/${newsletterId}`);
  }

  const { newsletter, currentVersion, approvedVersion, audiences } = payload;

  if (
    newsletter.status === "needs_approval" ||
    newsletter.status === "scheduled" ||
    newsletter.status === "sending" ||
    newsletter.status === "sent"
  ) {
    redirect(`/newsletters/${newsletterId}`);
  }

  const memberCountByAudience: Record<string, number> = {};
  await Promise.all(
    audiences.map(async (audience) => {
      const ids = await listNewsletterAudienceMemberIds(organization.id, audience.id);
      memberCountByAudience[audience.id] = ids.length;
    }),
  );

  const previewState =
    currentVersion?.snapshot ??
    approvedVersion?.snapshot ??
    newsletter.composerState;

  const isResubmit = newsletter.status === "changes_requested";

  return (
    <NewsletterPreviewSendShell
      newsletter={newsletter}
      previewState={previewState}
      audiences={audiences}
      memberCountByAudience={memberCountByAudience}
      approverDisplayName={
        assignee.hasAssignedPerson ? assignee.assigneeDisplayName : null
      }
      isResubmit={isResubmit}
    />
  );
}
