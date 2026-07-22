import "server-only";

export type ExecutedParty = {
  roleLabel: string;
  legalName: string;
  title?: string | null;
  email?: string | null;
  companyName?: string | null;
  signedAt: string;
  signatureDataUrl: string | null;
};

export type RenderExecutedAgreementInput = {
  title: string;
  documentNumber: string | null;
  versionLabel: string;
  bodyHtml: string;
  developer: ExecutedParty;
  company: ExecutedParty | null;
  fullyExecuted: boolean;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
}

function partyBlock(party: ExecutedParty): string {
  const signature = party.signatureDataUrl
    ? `<img src="${party.signatureDataUrl}" alt="Signature of ${escapeHtml(party.legalName)}" style="max-width:280px;max-height:90px;display:block;margin:8px 0 4px;" />`
    : `<p style="color:#8a8278;font-style:italic;">Signature pending</p>`;

  return `
    <div style="margin-top:28px;padding-top:18px;border-top:1px solid #ddd4c8;">
      <h3 style="margin:0 0 12px;font-family:Georgia,serif;font-size:16px;">${escapeHtml(party.roleLabel)}</h3>
      <p style="margin:4px 0;"><strong>Printed name:</strong> ${escapeHtml(party.legalName)}</p>
      ${party.title ? `<p style="margin:4px 0;"><strong>Title:</strong> ${escapeHtml(party.title)}</p>` : ""}
      ${party.email ? `<p style="margin:4px 0;"><strong>Email:</strong> ${escapeHtml(party.email)}</p>` : ""}
      ${party.companyName ? `<p style="margin:4px 0;"><strong>Company:</strong> ${escapeHtml(party.companyName)}</p>` : ""}
      <p style="margin:4px 0;"><strong>Date / time:</strong> ${escapeHtml(formatDate(party.signedAt))}</p>
      <p style="margin:12px 0 4px;"><strong>Electronic signature:</strong></p>
      ${signature}
    </div>
  `;
}

/**
 * Builds a self-contained HTML packet: original agreement body + populated signature page.
 */
export function renderExecutedAgreementHtml(
  input: RenderExecutedAgreementInput,
): string {
  const statusLabel = input.fullyExecuted
    ? "Fully executed"
    : "Awaiting Hey Ralli counter-signature";

  const companyBlock = input.company
    ? partyBlock(input.company)
    : `
      <div style="margin-top:28px;padding-top:18px;border-top:1px solid #ddd4c8;">
        <h3 style="margin:0 0 12px;font-family:Georgia,serif;font-size:16px;">Hey Ralli, LLC</h3>
        <p style="color:#8a8278;font-style:italic;">Company signature pending.</p>
      </div>
    `;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(input.title)} — ${escapeHtml(input.versionLabel)}</title>
  <style>
    body { font-family: Georgia, "Times New Roman", serif; color: #2a2622; max-width: 760px; margin: 0 auto; padding: 32px 24px 64px; line-height: 1.55; }
    h1, h2, h3 { font-weight: 600; }
    .meta { font-family: system-ui, sans-serif; font-size: 13px; color: #5c554c; margin-bottom: 24px; }
    .badge { display: inline-block; padding: 4px 10px; border-radius: 999px; background: ${input.fullyExecuted ? "#eef2ec" : "#f6efe4"}; color: ${input.fullyExecuted ? "#3f5240" : "#6b5e45"}; font-family: system-ui, sans-serif; font-size: 12px; font-weight: 600; }
    .agreement-body { border: 1px solid #ddd4c8; border-radius: 12px; padding: 24px; background: #fffcf7; }
    .agreement-body table { border-collapse: collapse; width: 100%; }
    .agreement-body td, .agreement-body th { border: 1px solid #eee7dc; padding: 6px 8px; vertical-align: top; }
  </style>
</head>
<body>
  <p class="badge">${statusLabel}</p>
  <h1 style="margin:16px 0 8px;">${escapeHtml(input.title)}</h1>
  <div class="meta">
    ${input.documentNumber ? `Document ${escapeHtml(input.documentNumber)} · ` : ""}
    Version ${escapeHtml(input.versionLabel)} · Hey Ralli, LLC
  </div>
  <div class="agreement-body">
    ${input.bodyHtml}
  </div>
  <section style="margin-top:40px;">
    <h2 style="font-family:Georgia,serif;">Executed signature page</h2>
    <p style="font-family:system-ui,sans-serif;font-size:14px;color:#5c554c;">
      The fields below were completed electronically in Hey Ralli. Typed legal names and drawn signatures
      constitute the parties&rsquo; electronic signatures.
    </p>
    ${partyBlock(input.developer)}
    ${companyBlock}
  </section>
</body>
</html>`;
}
