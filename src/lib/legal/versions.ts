/**
 * Server-side source of truth for customer legal-document versions.
 * Bump CURRENT_TERMS_VERSION when publishing material Terms changes so
 * users without a matching legal_acceptances row are asked to re-accept.
 * Do not treat the visible "Last Updated" string as the version id.
 */
export const CURRENT_TERMS_VERSION = "2026-08-14";

/** Matches the Privacy Policy Effective / Last Updated dates (do not change Privacy copy here). */
export const CURRENT_PRIVACY_VERSION = "2026-08-14";

export const LEGAL_ACCEPTANCE_PATH = "/account/legal";

export const LEGAL_DOCUMENT_TYPES = ["terms", "privacy"] as const;
export type LegalDocumentType = (typeof LEGAL_DOCUMENT_TYPES)[number];

export const LEGAL_ACCEPTANCE_SOURCES = [
  "signup",
  "invite",
  "reaccept_gate",
] as const;
export type LegalAcceptanceSource = (typeof LEGAL_ACCEPTANCE_SOURCES)[number];
