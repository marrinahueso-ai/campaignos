import {
  CURRENT_PRIVACY_VERSION,
  CURRENT_TERMS_VERSION,
  LEGAL_ACCEPTANCE_PATH,
  type LegalAcceptanceSource,
  type LegalDocumentType,
} from "@/lib/legal/versions";

export type LegalAcceptanceInsert = {
  user_id: string;
  document_type: LegalDocumentType;
  version: string;
  source: LegalAcceptanceSource;
};

/**
 * Always bind inserts to the authenticated session user. A browser-supplied
 * user id is ignored so callers cannot record acceptance for someone else.
 */
export function buildLegalAcceptanceInserts(input: {
  sessionUserId: string;
  requestedUserId?: string | null;
  source: LegalAcceptanceSource;
  termsVersion?: string;
  privacyVersion?: string;
}): LegalAcceptanceInsert[] {
  const userId = input.sessionUserId.trim();
  if (!userId) {
    return [];
  }

  const termsVersion = input.termsVersion ?? CURRENT_TERMS_VERSION;
  const privacyVersion = input.privacyVersion ?? CURRENT_PRIVACY_VERSION;

  return [
    {
      user_id: userId,
      document_type: "terms",
      version: termsVersion,
      source: input.source,
    },
    {
      user_id: userId,
      document_type: "privacy",
      version: privacyVersion,
      source: input.source,
    },
  ];
}

export function hasAcceptedTermsVersion(
  acceptedTermsVersion: string | null | undefined,
  currentVersion: string = CURRENT_TERMS_VERSION,
): boolean {
  return (
    Boolean(acceptedTermsVersion?.trim()) &&
    acceptedTermsVersion === currentVersion
  );
}

export function userMustAcceptCurrentTermsFromRows(
  acceptedTermsVersions: readonly string[],
  currentVersion: string = CURRENT_TERMS_VERSION,
): boolean {
  return !acceptedTermsVersions.includes(currentVersion);
}

export function isLegalAcceptancePath(pathname: string): boolean {
  return (
    pathname === LEGAL_ACCEPTANCE_PATH ||
    pathname.startsWith(`${LEGAL_ACCEPTANCE_PATH}/`)
  );
}

/** Drop next= values that would bounce the user back onto the gate. */
export function safePostAcceptancePath(
  next: string | null | undefined,
): string | null {
  if (!next?.trim()) return null;
  const value = next.trim();
  if (isLegalAcceptancePath(value.split("?")[0] ?? value)) {
    return null;
  }
  return value;
}

export function termsAcceptanceRedirectPath(next?: string | null): string {
  const safe = safePostAcceptancePath(next);
  if (!safe) return LEGAL_ACCEPTANCE_PATH;
  return `${LEGAL_ACCEPTANCE_PATH}?next=${encodeURIComponent(safe)}`;
}
