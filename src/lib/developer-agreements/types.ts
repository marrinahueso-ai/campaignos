export type DeveloperAgreementDocument = {
  id: string;
  slug: string;
  title: string;
  description: string;
  documentNumber: string | null;
  sortOrder: number;
  requiredForRoles: string[];
  isActive: boolean;
  currentVersionId: string | null;
};

export type DeveloperAgreementVersion = {
  id: string;
  documentId: string;
  versionLabel: string;
  bodyHtml: string;
  sourceFilename: string | null;
  storagePath: string | null;
  effectiveAt: string;
  isPublished: boolean;
};

export type DeveloperAgreementForSigning = DeveloperAgreementDocument & {
  version: DeveloperAgreementVersion;
  signed: boolean;
};

export type DeveloperAgreementSigningProgress = {
  mustSign: boolean;
  documents: DeveloperAgreementForSigning[];
  unsignedCount: number;
  signedCount: number;
};
