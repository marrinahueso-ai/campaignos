import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import {
  buildDeveloperAgreementCountersignEmail,
  buildDeveloperAgreementExecutedEmail,
  resolveDeveloperAgreementCountersignTemplateId,
  resolveDeveloperAgreementExecutedTemplateId,
} from "@/lib/email/developer-agreement-emails";
import { sendEmail, sendTemplateEmail } from "@/lib/email/send";
import { renderExecutedAgreementHtml } from "@/lib/developer-agreements/render-executed";
import {
  getAgreementsSiteOrigin,
  getDeveloperAgreementOwnerEmails,
} from "@/lib/developer-agreements/owner-emails";
import { createExecutedAgreementDownloadToken } from "@/lib/developer-agreements/download-token";
import {
  signaturePathToDataUrl,
  uploadAgreementBytes,
} from "@/lib/developer-agreements/storage";

type SignatureRow = {
  id: string;
  user_id: string;
  document_id: string;
  version_id: string;
  typed_legal_name: string;
  signer_email: string | null;
  signer_company_name: string | null;
  signature_image_path: string;
  signed_at: string;
  status: string;
  company_typed_legal_name: string | null;
  company_title: string | null;
  company_email: string | null;
  company_organization_name: string | null;
  company_signature_image_path: string | null;
  company_signed_at: string | null;
  executed_html_path: string | null;
};

export async function buildAndStoreExecutedPacket(signatureId: string): Promise<{
  html: string;
  path: string;
} | { error: string }> {
  const admin = createAdminClient();
  const { data: signature, error } = await admin
    .from("developer_agreement_signatures")
    .select(
      "id, user_id, document_id, version_id, typed_legal_name, signer_email, signer_company_name, signature_image_path, signed_at, status, company_typed_legal_name, company_title, company_email, company_organization_name, company_signature_image_path, company_signed_at, executed_html_path",
    )
    .eq("id", signatureId)
    .maybeSingle();

  if (error || !signature) {
    return { error: error?.message ?? "Signature not found." };
  }

  const row = signature as SignatureRow;

  const [{ data: document }, { data: version }, { data: authUser }] =
    await Promise.all([
      admin
        .from("developer_agreement_documents")
        .select("title, document_number")
        .eq("id", row.document_id)
        .maybeSingle(),
      admin
        .from("developer_agreement_versions")
        .select("version_label, body_html")
        .eq("id", row.version_id)
        .maybeSingle(),
      admin.auth.admin.getUserById(row.user_id),
    ]);

  if (!document || !version) {
    return { error: "Agreement document/version missing." };
  }

  const developerSig = await signaturePathToDataUrl(row.signature_image_path);
  const companySig = await signaturePathToDataUrl(
    row.company_signature_image_path,
  );
  const fullyExecuted =
    row.status === "fully_executed" && Boolean(row.company_signed_at);

  const html = renderExecutedAgreementHtml({
    title: document.title,
    documentNumber: document.document_number,
    versionLabel: version.version_label,
    bodyHtml: version.body_html,
    developer: {
      roleLabel: "Receiving Party / Contributor",
      legalName: row.typed_legal_name,
      email: row.signer_email || authUser.user?.email || null,
      companyName: row.signer_company_name,
      signedAt: row.signed_at,
      signatureDataUrl: developerSig,
    },
    company: fullyExecuted
      ? {
          roleLabel: "Hey Ralli, LLC",
          legalName:
            row.company_typed_legal_name || "Authorized Representative",
          title: row.company_title || "Authorized Representative",
          email:
            row.company_email ||
            getDeveloperAgreementOwnerEmails()[0] ||
            null,
          companyName: row.company_organization_name,
          signedAt: row.company_signed_at!,
          signatureDataUrl: companySig,
        }
      : null,
    fullyExecuted,
  });

  const path = `executed/${row.user_id}/${row.version_id}.html`;
  const uploaded = await uploadAgreementBytes({
    path,
    bytes: Buffer.from(html, "utf8"),
    contentType: "text/html; charset=utf-8",
  });
  if ("error" in uploaded) {
    return { error: uploaded.error };
  }

  await admin
    .from("developer_agreement_signatures")
    .update({ executed_html_path: path })
    .eq("id", signatureId);

  return { html, path };
}

export async function notifyOwnersDeveloperSigned(input: {
  signatureId: string;
  developerName: string;
  developerEmail: string;
  documentTitle: string;
  versionLabel: string;
}): Promise<void> {
  const owners = getDeveloperAgreementOwnerEmails();
  if (!owners.length) {
    console.warn(
      "No HEY_RALLI_OWNER_EMAILS configured; skip countersign notify.",
    );
    return;
  }

  const origin = getAgreementsSiteOrigin();
  const countersignUrl = `${origin}/account/agreements/countersign?id=${encodeURIComponent(input.signatureId)}`;
  const content = buildDeveloperAgreementCountersignEmail({
    developerName: input.developerName,
    developerEmail: input.developerEmail,
    documentTitle: input.documentTitle,
    versionLabel: input.versionLabel,
    countersignUrl,
  });

  let result = await sendTemplateEmail({
    to: owners,
    templateId: resolveDeveloperAgreementCountersignTemplateId(),
    subject: content.subject,
    variables: {
      DEVELOPER_NAME: input.developerName,
      DEVELOPER_EMAIL: input.developerEmail,
      DOCUMENT_TITLE: input.documentTitle,
      VERSION_LABEL: input.versionLabel,
      COUNTERSIGN_URL: countersignUrl,
    },
  });

  if (!result.success) {
    console.warn(
      "Resend countersign template failed; falling back to HTML:",
      result.error,
    );
    result = await sendEmail({
      to: owners,
      subject: content.subject,
      html: content.html,
      text: content.text,
    });
  }

  if (result.success) {
    const admin = createAdminClient();
    await admin
      .from("developer_agreement_signatures")
      .update({ company_notified_at: new Date().toISOString() })
      .eq("id", input.signatureId);
  } else {
    console.error("countersign notify failed:", result.error);
  }
}

export async function emailExecutedAgreementCopy(input: {
  signatureId: string;
  html: string;
  documentTitle: string;
  versionLabel: string;
  developerEmail: string;
  developerName: string;
}): Promise<void> {
  const owners = getDeveloperAgreementOwnerEmails();
  const recipients = [
    ...new Set(
      [input.developerEmail, ...owners]
        .map((email) => email.trim().toLowerCase())
        .filter(Boolean),
    ),
  ];
  if (!recipients.length) return;

  // App-origin download with a time-limited HMAC token so email CTAs work
  // without login and Safari gets Content-Type: text/html (Storage signed URLs
  // often serve as octet-stream / text/plain and show raw source).
  const token = createExecutedAgreementDownloadToken(input.signatureId);
  const downloadUrl = `${getAgreementsSiteOrigin()}/api/developer-agreements/download?id=${encodeURIComponent(input.signatureId)}&token=${encodeURIComponent(token)}`;

  const content = buildDeveloperAgreementExecutedEmail({
    developerName: input.developerName,
    developerEmail: input.developerEmail,
    documentTitle: input.documentTitle,
    versionLabel: input.versionLabel,
    downloadUrl,
  });
  const filename = `${slugify(input.documentTitle)}-${input.versionLabel}-executed.html`;

  // Primary: published Resend template (editable in the Resend dashboard).
  // CTA uses the app download API (tokenized). Templates cannot attach files.
  let result = await sendTemplateEmail({
    to: recipients,
    templateId: resolveDeveloperAgreementExecutedTemplateId(),
    subject: content.subject,
    variables: {
      DEVELOPER_NAME: input.developerName,
      DEVELOPER_EMAIL: input.developerEmail,
      DOCUMENT_TITLE: input.documentTitle,
      VERSION_LABEL: input.versionLabel,
      DOWNLOAD_URL: downloadUrl,
    },
  });

  if (!result.success) {
    console.warn(
      "Resend executed template failed; falling back to HTML+attachment:",
      result.error,
    );
    result = await sendEmail({
      to: recipients,
      subject: content.subject,
      html: content.html,
      text: content.text,
      attachments: [
        {
          filename,
          content: Buffer.from(input.html, "utf8"),
          contentType: "text/html; charset=utf-8",
        },
      ],
    });
  }

  if (result.success) {
    const admin = createAdminClient();
    await admin
      .from("developer_agreement_signatures")
      .update({ executed_emailed_at: new Date().toISOString() })
      .eq("id", input.signatureId);
  } else {
    console.error("executed email failed:", result.error);
  }
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}
