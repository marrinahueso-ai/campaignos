/**
 * Resend template aliases + local HTML fallbacks for developer agreement emails.
 */

export const DEVELOPER_AGREEMENT_COUNTERSIGN_TEMPLATE_ALIAS =
  "developer-agreement-countersign";

export const DEVELOPER_AGREEMENT_EXECUTED_TEMPLATE_ALIAS =
  "developer-agreement-executed";

/** Stable published Resend template ids. */
export const DEVELOPER_AGREEMENT_COUNTERSIGN_TEMPLATE_ID =
  "0d05ada9-02f0-4995-8ea9-03e7db09e91b";

export const DEVELOPER_AGREEMENT_EXECUTED_TEMPLATE_ID =
  "4a8acff5-cddc-4aa5-8ee7-bfe262872ed4";

export function resolveDeveloperAgreementCountersignTemplateId(): string {
  return (
    process.env.RESEND_DEVELOPER_AGREEMENT_COUNTERSIGN_TEMPLATE_ID?.trim() ||
    DEVELOPER_AGREEMENT_COUNTERSIGN_TEMPLATE_ID ||
    DEVELOPER_AGREEMENT_COUNTERSIGN_TEMPLATE_ALIAS
  );
}

export function resolveDeveloperAgreementExecutedTemplateId(): string {
  return (
    process.env.RESEND_DEVELOPER_AGREEMENT_EXECUTED_TEMPLATE_ID?.trim() ||
    DEVELOPER_AGREEMENT_EXECUTED_TEMPLATE_ID ||
    DEVELOPER_AGREEMENT_EXECUTED_TEMPLATE_ALIAS
  );
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

/** Branded HTML used when Resend template send fails (or for attachment companion). */
export function buildDeveloperAgreementCountersignEmail(input: {
  developerName: string;
  developerEmail: string;
  documentTitle: string;
  versionLabel: string;
  countersignUrl: string;
}): { subject: string; html: string; text: string } {
  const subject = `${input.developerName} signed ${input.documentTitle}`;
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background-color:#ebe4d9;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#ebe4d9;padding-top:32px;padding-bottom:32px;padding-left:12px;padding-right:12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="width:560px;max-width:100%;background-color:#f6f2eb;border:1px solid #ddd4c8;border-radius:20px;">
          <tr>
            <td bgcolor="#2a2622" style="background-color:#2a2622;padding-top:22px;padding-bottom:22px;padding-left:32px;padding-right:32px;">
              <p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:22px;line-height:1.3;color:#f6f2eb;">Hey Ralli</p>
              <p style="margin-top:6px;margin-bottom:0;margin-left:0;margin-right:0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.4;color:#a89f94;letter-spacing:0.08em;text-transform:uppercase;">Developer agreements</p>
            </td>
          </tr>
          <tr>
            <td style="padding-top:28px;padding-bottom:8px;padding-left:32px;padding-right:32px;font-family:Arial,Helvetica,sans-serif;color:#2a2622;">
              <h1 style="margin:0;margin-bottom:12px;font-family:Georgia,'Times New Roman',serif;font-size:26px;font-weight:500;line-height:1.25;color:#2a2622;">Counter-signature needed</h1>
              <p style="margin:0;margin-bottom:12px;font-size:15px;line-height:1.55;color:#5c554c;">
                <strong style="color:#2a2622;">${escapeHtml(input.developerName)}</strong>
                (${escapeHtml(input.developerEmail)}) signed
                <strong style="color:#2a2622;">${escapeHtml(input.documentTitle)}</strong>
                (${escapeHtml(input.versionLabel)}).
              </p>
              <p style="margin:0;margin-bottom:24px;font-size:14px;line-height:1.55;color:#5c554c;">
                Please counter-sign for Hey Ralli, LLC. After you sign, a fully executed copy is emailed to everyone.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding-top:0;padding-bottom:28px;padding-left:32px;padding-right:32px;font-family:Arial,Helvetica,sans-serif;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td bgcolor="#2a2622" style="background-color:#2a2622;border-radius:999px;">
                    <a href="${escapeHtml(input.countersignUrl)}" style="display:inline-block;padding-top:14px;padding-bottom:14px;padding-left:22px;padding-right:22px;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:600;line-height:1.2;color:#f6f2eb;text-decoration:none;">
                      Open counter-sign page
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = `${input.developerName} (${input.developerEmail}) signed ${input.documentTitle} (${input.versionLabel}). Counter-sign: ${input.countersignUrl}`;

  return { subject, html, text };
}

export function buildDeveloperAgreementExecutedEmail(input: {
  developerName: string;
  developerEmail: string;
  documentTitle: string;
  versionLabel: string;
  downloadUrl: string;
}): { subject: string; html: string; text: string } {
  const subject = `Fully executed: ${input.documentTitle} (${input.versionLabel})`;
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background-color:#ebe4d9;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#ebe4d9;padding-top:32px;padding-bottom:32px;padding-left:12px;padding-right:12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="width:560px;max-width:100%;background-color:#f6f2eb;border:1px solid #ddd4c8;border-radius:20px;">
          <tr>
            <td bgcolor="#2a2622" style="background-color:#2a2622;padding-top:22px;padding-bottom:22px;padding-left:32px;padding-right:32px;">
              <p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:22px;line-height:1.3;color:#f6f2eb;">Hey Ralli</p>
              <p style="margin-top:6px;margin-bottom:0;margin-left:0;margin-right:0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.4;color:#a89f94;letter-spacing:0.08em;text-transform:uppercase;">Fully executed agreement</p>
            </td>
          </tr>
          <tr>
            <td style="padding-top:28px;padding-bottom:8px;padding-left:32px;padding-right:32px;font-family:Arial,Helvetica,sans-serif;color:#2a2622;">
              <h1 style="margin:0;margin-bottom:12px;font-family:Georgia,'Times New Roman',serif;font-size:26px;font-weight:500;line-height:1.25;color:#2a2622;">Agreement fully executed</h1>
              <p style="margin:0;margin-bottom:12px;font-size:15px;line-height:1.55;color:#5c554c;">
                Both parties have signed. A complete copy is attached (open in a browser), and you can download it anytime from Hey Ralli.
              </p>
              <p style="margin:0;margin-bottom:8px;font-size:14px;line-height:1.55;color:#5c554c;">
                <strong style="color:#2a2622;">Document:</strong> ${escapeHtml(input.documentTitle)}
              </p>
              <p style="margin:0;margin-bottom:8px;font-size:14px;line-height:1.55;color:#5c554c;">
                <strong style="color:#2a2622;">Version:</strong> ${escapeHtml(input.versionLabel)}
              </p>
              <p style="margin:0;margin-bottom:24px;font-size:14px;line-height:1.55;color:#5c554c;">
                <strong style="color:#2a2622;">Contributor:</strong> ${escapeHtml(input.developerName)} (${escapeHtml(input.developerEmail)})
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding-top:0;padding-bottom:28px;padding-left:32px;padding-right:32px;font-family:Arial,Helvetica,sans-serif;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td bgcolor="#2a2622" style="background-color:#2a2622;border-radius:999px;">
                    <a href="${escapeHtml(input.downloadUrl)}" style="display:inline-block;padding-top:14px;padding-bottom:14px;padding-left:22px;padding-right:22px;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:600;line-height:1.2;color:#f6f2eb;text-decoration:none;">
                      Download executed copy
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = `Fully executed: ${input.documentTitle} (${input.versionLabel}). Contributor: ${input.developerName}. Download: ${input.downloadUrl}`;

  return { subject, html, text };
}
