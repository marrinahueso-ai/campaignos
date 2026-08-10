import Link from "next/link";
import { notFound } from "next/navigation";

import { PrepareForSendShell } from "@/components/newsletters/PrepareForSendShell";
import { accessHasPermission, getEffectiveAccess } from "@/lib/access-templates/effective-access";
import { getCurrentOrganization } from "@/lib/auth/organization-context";
import { prepareSend } from "@/lib/newsletter/actions";
import { isNewsletterProductionSendEnabled } from "@/lib/newsletter/production-gate";
import { getNewsletterDetailPayload } from "@/lib/newsletter/queries";

interface PrepareSendPageProps {
  params: Promise<{ newsletterId: string }>;
}

export const metadata = {
  title: "Send newsletter",
  robots: { index: false, follow: false },
};

export default async function PrepareSendPage({ params }: PrepareSendPageProps) {
  const { newsletterId } = await params;
  const organization = await getCurrentOrganization();

  if (!organization) {
    return (
      <div className="studio-page space-y-4">
        <p className="text-sm text-cos-muted">
          Sign in and set up your organization to continue.
        </p>
      </div>
    );
  }

  const access = await getEffectiveAccess();
  const canSendNewsletter = access ? accessHasPermission(access, "send_newsletter") : false;

  const payload = await getNewsletterDetailPayload(organization.id, newsletterId);
  if (!payload) {
    notFound();
  }

  if (!canSendNewsletter) {
    return (
      <div className="studio-page space-y-4">
        <Link
          href={`/newsletters/${newsletterId}`}
          className="text-sm font-semibold text-cos-muted transition hover:text-cos-text"
        >
          ← Back to newsletter
        </Link>
        <div className="rounded-2xl border border-cos-border bg-cos-card px-4 py-3.5 text-sm text-cos-muted shadow-[0_8px_28px_rgba(28,36,48,0.06)]">
          You don&apos;t have permission to send newsletters. Ask a teammate with send access to
          continue this one.
        </div>
      </div>
    );
  }

  if (payload.newsletter.status !== "approved" && payload.newsletter.status !== "scheduled") {
    return (
      <div className="studio-page space-y-4">
        <Link
          href={`/newsletters/${newsletterId}`}
          className="text-sm font-semibold text-cos-muted transition hover:text-cos-text"
        >
          ← Back to newsletter
        </Link>
        <div className="rounded-2xl border border-cos-border bg-cos-card px-4 py-3.5 text-sm text-cos-muted shadow-[0_8px_28px_rgba(28,36,48,0.06)]">
          This newsletter isn&apos;t approved yet — it needs to go through approval before it can
          be sent.
        </div>
      </div>
    );
  }

  const validation = await prepareSend(newsletterId);
  const productionSendEnabled = isNewsletterProductionSendEnabled();
  const currentSend = payload.sends.find((send) => send.status === "scheduled") ?? null;

  return (
    <PrepareForSendShell
      newsletter={payload.newsletter}
      audiences={payload.audiences}
      approvedAudience={payload.approvedAudience}
      senderProfile={payload.senderProfile}
      validation={validation}
      productionSendEnabled={productionSendEnabled}
      currentScheduledSend={currentSend}
    />
  );
}
