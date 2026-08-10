/**
 * Server-controlled compliance footer (CAN-SPAM style): organization name,
 * physical mailing address, why-receiving line, and an unsubscribe link.
 * Callers never author this HTML — it is always generated here and injected
 * right before send, so it can't be stripped or edited from the composer.
 */

export interface NewsletterMailingAddressInput {
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string | null;
  /** Org-level override (e.g. a PO box) — used only when org fields are incomplete. */
  override?: string | null;
}

function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Joins whatever mailing-address fields are present into one display line. */
export function buildPhysicalAddress(input: NewsletterMailingAddressInput): string {
  const override = input.override?.trim();
  const line1 = input.addressLine1?.trim() || "";
  const line2 = input.addressLine2?.trim() || "";
  const city = input.city?.trim() || "";
  const state = input.state?.trim() || "";
  const postalCode = input.postalCode?.trim() || "";
  const country = input.country?.trim() || "";

  const hasOrgAddress = Boolean(line1 && city && (state || country));
  if (!hasOrgAddress && override) {
    return override;
  }

  const cityStateZip = [
    [city, state].filter(Boolean).join(", "),
    postalCode,
  ]
    .filter(Boolean)
    .join(" ");

  return [line1, line2, cityStateZip, country].filter(Boolean).join(", ");
}

/**
 * CAN-SPAM requires a valid physical postal address. Require street +
 * city + (state or country) at minimum, unless an explicit override is set.
 */
export function hasRequiredMailingAddress(
  input: NewsletterMailingAddressInput,
): boolean {
  const line1 = input.addressLine1?.trim();
  const city = input.city?.trim();
  const stateOrCountry = input.state?.trim() || input.country?.trim();
  if (line1 && city && stateOrCountry) {
    return true;
  }
  return Boolean(input.override?.trim());
}

/** Literal token replaced per-recipient at send time with a signed unsubscribe URL. */
export const UNSUBSCRIBE_URL_PLACEHOLDER = "{{UNSUBSCRIBE_URL}}";

export interface NewsletterComplianceFooterInput {
  organizationName: string;
  physicalAddress: string;
  /** Short explanation of why the recipient is receiving this email. */
  whyReceiving?: string;
}

const DEFAULT_WHY_RECEIVING =
  "You're receiving this email because you're a subscriber to this organization's newsletter.";

/** Builds the footer HTML fragment. Contains the unsubscribe placeholder token. */
export function buildComplianceFooterHtml(
  input: NewsletterComplianceFooterInput,
): string {
  const orgName = esc(input.organizationName.trim() || "This organization");
  const address = esc(input.physicalAddress.trim());
  const whyReceiving = esc(input.whyReceiving?.trim() || DEFAULT_WHY_RECEIVING);

  return `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0 0;">
  <tr>
    <td style="border-top:1px solid #e2ddd0;padding:16px 4px 0;font-family:Arial,sans-serif;font-size:11px;line-height:1.5;color:#8a8478;text-align:center;">
      <div style="font-weight:700;color:#5a655c;">${orgName}</div>
      ${address ? `<div>${address}</div>` : ""}
      <div style="margin-top:6px;">${whyReceiving}</div>
      <div style="margin-top:6px;">
        <a href="${UNSUBSCRIBE_URL_PLACEHOLDER}" style="color:#5a655c;text-decoration:underline;">Unsubscribe</a>
      </div>
    </td>
  </tr>
</table>`;
}

/** Injects the compliance footer before `</body>`, or appends when absent. */
export function injectComplianceFooter(html: string, footerHtml: string): string {
  if (/<\/body>/i.test(html)) {
    return html.replace(/<\/body>/i, `${footerHtml}\n</body>`);
  }
  return `${html}\n${footerHtml}`;
}
