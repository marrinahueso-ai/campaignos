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

export type AgreementSignatureReceipt = {
  legalName: string;
  email: string;
  companyName: string | null;
  signedAt: string;
  signatureDataUrl: string | null;
};

export type DeveloperAgreementForSigning = DeveloperAgreementDocument & {
  version: DeveloperAgreementVersion;
  signed: boolean;
  receipt: AgreementSignatureReceipt | null;
};

export type DeveloperAgreementSigningProgress = {
  mustSign: boolean;
  documents: DeveloperAgreementForSigning[];
  unsignedCount: number;
  signedCount: number;
};
