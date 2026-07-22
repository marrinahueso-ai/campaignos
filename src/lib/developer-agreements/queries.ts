import "server-only";

import { createClient } from "@/lib/supabase/server";
import {
  getActiveCampaignRolesForUser,
} from "@/lib/developer-agreements/gate";
import type {
  DeveloperAgreementDocument,
  DeveloperAgreementForSigning,
  DeveloperAgreementSigningProgress,
  DeveloperAgreementVersion,
} from "@/lib/developer-agreements/types";

export {
  DEVELOPER_AGREEMENTS_COUNTERSIGN_PATH,
  DEVELOPER_AGREEMENTS_MANAGE_PATH,
  DEVELOPER_AGREEMENTS_PATH,
  userMustSignDeveloperAgreements,
} from "@/lib/developer-agreements/gate";

type DocumentRow = {
  id: string;
  slug: string;
  title: string;
  description: string;
  document_number: string | null;
  sort_order: number;
  required_for_roles: string[] | null;
  is_active: boolean;
  current_version_id: string | null;
};

type VersionRow = {
  id: string;
  document_id: string;
  version_label: string;
  body_html: string;
  source_filename: string | null;
  storage_path: string | null;
  effective_at: string;
  is_published: boolean;
};

function mapDocument(row: DocumentRow): DeveloperAgreementDocument {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description ?? "",
    documentNumber: row.document_number,
    sortOrder: row.sort_order,
    requiredForRoles: row.required_for_roles ?? ["developer"],
    isActive: row.is_active,
    currentVersionId: row.current_version_id,
  };
}

function mapVersion(row: VersionRow): DeveloperAgreementVersion {
  return {
    id: row.id,
    documentId: row.document_id,
    versionLabel: row.version_label,
    bodyHtml: row.body_html,
    sourceFilename: row.source_filename,
    storagePath: row.storage_path,
    effectiveAt: row.effective_at,
    isPublished: row.is_published,
  };
}

function rolesRequireDocument(
  userRoles: string[],
  requiredForRoles: string[],
): boolean {
  if (!userRoles.length || !requiredForRoles.length) {
    return false;
  }
  return requiredForRoles.some((role) => userRoles.includes(role));
}

export async function getDeveloperAgreementSigningProgress(
  userId: string,
): Promise<DeveloperAgreementSigningProgress> {
  const supabase = await createClient();
  const roles = await getActiveCampaignRolesForUser(supabase, userId);

  const { data: documents, error } = await supabase
    .from("developer_agreement_documents")
    .select(
      "id, slug, title, description, document_number, sort_order, required_for_roles, is_active, current_version_id",
    )
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error || !documents?.length) {
    return {
      mustSign: false,
      documents: [],
      unsignedCount: 0,
      signedCount: 0,
    };
  }

  const applicable = (documents as DocumentRow[]).filter((doc) =>
    rolesRequireDocument(roles, doc.required_for_roles ?? ["developer"]),
  );

  if (!applicable.length) {
    return {
      mustSign: false,
      documents: [],
      unsignedCount: 0,
      signedCount: 0,
    };
  }

  const versionIds = applicable
    .map((doc) => doc.current_version_id)
    .filter((id): id is string => Boolean(id));

  const emptyId = "00000000-0000-0000-0000-000000000000";
  const [{ data: versions }, { data: signatures }] = await Promise.all([
    supabase
      .from("developer_agreement_versions")
      .select(
        "id, document_id, version_label, body_html, source_filename, storage_path, effective_at, is_published",
      )
      .in("id", versionIds.length ? versionIds : [emptyId]),
    supabase
      .from("developer_agreement_signatures")
      .select(
        "version_id, typed_legal_name, signer_email, signer_company_name, signed_at, signature_image_path",
      )
      .eq("user_id", userId)
      .in("version_id", versionIds.length ? versionIds : [emptyId]),
  ]);

  const versionById = new Map(
    ((versions as VersionRow[] | null) ?? []).map((row) => [
      row.id,
      mapVersion(row),
    ]),
  );

  const receiptByVersion = new Map<
    string,
    {
      legalName: string;
      email: string;
      companyName: string | null;
      signedAt: string;
      signaturePath: string;
    }
  >();
  for (const row of signatures ?? []) {
    receiptByVersion.set(row.version_id as string, {
      legalName: String(row.typed_legal_name ?? ""),
      email: String(row.signer_email ?? ""),
      companyName: (row.signer_company_name as string | null) ?? null,
      signedAt: String(row.signed_at ?? ""),
      signaturePath: String(row.signature_image_path ?? ""),
    });
  }

  const forSigning: DeveloperAgreementForSigning[] = [];
  for (const doc of applicable) {
    if (!doc.current_version_id) continue;
    const version = versionById.get(doc.current_version_id);
    if (!version) continue;
    const receiptMeta = receiptByVersion.get(version.id) ?? null;
    let signatureDataUrl: string | null = null;
    if (receiptMeta?.signaturePath) {
      const { data: signed } = await supabase.storage
        .from("developer-agreements")
        .createSignedUrl(receiptMeta.signaturePath, 60 * 60);
      signatureDataUrl = signed?.signedUrl ?? null;
    }
    forSigning.push({
      ...mapDocument(doc),
      version,
      signed: Boolean(receiptMeta),
      receipt: receiptMeta
        ? {
            legalName: receiptMeta.legalName,
            email: receiptMeta.email,
            companyName: receiptMeta.companyName,
            signedAt: receiptMeta.signedAt,
            signatureDataUrl,
          }
        : null,
    });
  }

  const signedCount = forSigning.filter((doc) => doc.signed).length;
  const unsignedCount = forSigning.length - signedCount;

  return {
    mustSign: unsignedCount > 0,
    documents: forSigning,
    unsignedCount,
    signedCount,
  };
}

export async function listDeveloperAgreementDocumentsForManage() {
  const { createAdminClient, isSupabaseAdminConfigured } = await import(
    "@/lib/supabase/admin"
  );
  if (!isSupabaseAdminConfigured()) {
    return [];
  }
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("developer_agreement_documents")
    .select(
      "id, slug, title, description, document_number, sort_order, required_for_roles, is_active, current_version_id",
    )
    .order("sort_order", { ascending: true });

  if (error || !data) {
    return [];
  }

  const versionIds = data
    .map((row) => row.current_version_id)
    .filter((id): id is string => Boolean(id));

  const { data: versions } = versionIds.length
    ? await supabase
        .from("developer_agreement_versions")
        .select("id, version_label, effective_at, source_filename")
        .in("id", versionIds)
    : { data: [] as Array<{
        id: string;
        version_label: string;
        effective_at: string;
        source_filename: string | null;
      }> };

  const versionById = new Map((versions ?? []).map((row) => [row.id, row]));

  return (data as DocumentRow[]).map((doc) => {
    const current = doc.current_version_id
      ? versionById.get(doc.current_version_id)
      : null;
    return {
      ...mapDocument(doc),
      currentVersionLabel: current?.version_label ?? null,
      currentEffectiveAt: current?.effective_at ?? null,
      currentSourceFilename: current?.source_filename ?? null,
    };
  });
}

export type PendingCountersign = {
  id: string;
  status: string;
  developerName: string;
  developerEmail: string;
  documentTitle: string;
  versionLabel: string;
  signedAt: string;
  executedHtmlPath: string | null;
  fullyExecuted: boolean;
};

export async function listPendingCompanyCountersignatures(): Promise<
  PendingCountersign[]
> {
  const { createAdminClient, isSupabaseAdminConfigured } = await import(
    "@/lib/supabase/admin"
  );
  if (!isSupabaseAdminConfigured()) return [];
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("developer_agreement_signatures")
    .select(
      "id, status, typed_legal_name, signed_at, executed_html_path, user_id, document_id, version_id",
    )
    .order("signed_at", { ascending: false })
    .limit(100);

  if (error || !data?.length) return [];

  const results: PendingCountersign[] = [];
  for (const row of data) {
    const [{ data: document }, { data: version }, { data: authUser }] =
      await Promise.all([
        admin
          .from("developer_agreement_documents")
          .select("title")
          .eq("id", row.document_id)
          .maybeSingle(),
        admin
          .from("developer_agreement_versions")
          .select("version_label")
          .eq("id", row.version_id)
          .maybeSingle(),
        admin.auth.admin.getUserById(row.user_id),
      ]);

    results.push({
      id: row.id,
      status: row.status,
      developerName: row.typed_legal_name,
      developerEmail: authUser.user?.email ?? "",
      documentTitle: document?.title ?? "Agreement",
      versionLabel: version?.version_label ?? "",
      signedAt: row.signed_at,
      executedHtmlPath: row.executed_html_path,
      fullyExecuted: row.status === "fully_executed",
    });
  }

  return results;
}

export async function getCountersignDetail(signatureId: string) {
  const { createAdminClient, isSupabaseAdminConfigured } = await import(
    "@/lib/supabase/admin"
  );
  if (!isSupabaseAdminConfigured()) return null;
  const admin = createAdminClient();

  const { data: row, error } = await admin
    .from("developer_agreement_signatures")
    .select(
      "id, status, typed_legal_name, signer_email, signer_company_name, signed_at, signature_image_path, user_id, document_id, version_id, company_typed_legal_name, company_title, company_email, company_organization_name, company_signature_image_path, company_signed_at",
    )
    .eq("id", signatureId)
    .maybeSingle();

  if (error || !row) return null;

  const [{ data: document }, { data: version }, { data: authUser }, { data: profile }] =
    await Promise.all([
      admin
        .from("developer_agreement_documents")
        .select("id, title, description, document_number")
        .eq("id", row.document_id)
        .maybeSingle(),
      admin
        .from("developer_agreement_versions")
        .select("id, version_label, body_html, effective_at")
        .eq("id", row.version_id)
        .maybeSingle(),
      admin.auth.admin.getUserById(row.user_id),
      admin
        .from("developer_agreement_company_profile")
        .select("legal_name, title, email, organization_name")
        .eq("id", 1)
        .maybeSingle(),
    ]);

  if (!document || !version) return null;

  let developerSignatureDataUrl: string | null = null;
  if (row.signature_image_path) {
    const { data: signed } = await admin.storage
      .from("developer-agreements")
      .createSignedUrl(row.signature_image_path as string, 60 * 60);
    developerSignatureDataUrl = signed?.signedUrl ?? null;
  }

  let companySignatureDataUrl: string | null = null;
  if (row.company_signature_image_path) {
    const { data: signed } = await admin.storage
      .from("developer-agreements")
      .createSignedUrl(row.company_signature_image_path as string, 60 * 60);
    companySignatureDataUrl = signed?.signedUrl ?? null;
  }

  return {
    signatureId: row.id,
    status: row.status as string,
    fullyExecuted: row.status === "fully_executed",
    developer: {
      name: row.typed_legal_name as string,
      email:
        (row.signer_email as string | null) ||
        authUser.user?.email ||
        "",
      companyName: (row.signer_company_name as string | null) ?? null,
      signedAt: row.signed_at as string,
      signatureDataUrl: developerSignatureDataUrl,
    },
    companyReceipt:
      row.status === "fully_executed" && row.company_signed_at
        ? {
            name: (row.company_typed_legal_name as string) || "",
            email: (row.company_email as string | null) || "",
            companyName:
              (row.company_organization_name as string | null) || null,
            title: (row.company_title as string | null) || null,
            signedAt: row.company_signed_at as string,
            signatureDataUrl: companySignatureDataUrl,
          }
        : null,
    document: {
      id: document.id as string,
      title: document.title as string,
      description: (document.description as string) ?? "",
      documentNumber: (document.document_number as string | null) ?? null,
    },
    version: {
      id: version.id as string,
      versionLabel: version.version_label as string,
      bodyHtml: version.body_html as string,
      effectiveAt: version.effective_at as string,
    },
    companyDefaults: {
      legalName:
        (row.company_typed_legal_name as string | null) ||
        profile?.legal_name ||
        "",
      title:
        (row.company_title as string | null) ||
        profile?.title ||
        "Authorized Representative",
      email: (row.company_email as string | null) || profile?.email || "",
      organizationName:
        (row.company_organization_name as string | null) ||
        profile?.organization_name ||
        "Hey Ralli, LLC",
    },
  };
}

export async function listMyExecutedAgreements(userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("developer_agreement_signatures")
    .select(
      "id, status, typed_legal_name, signed_at, executed_html_path, document_id, version_id, company_signed_at",
    )
    .eq("user_id", userId)
    .order("signed_at", { ascending: false });

  if (error || !data?.length) return [];

  const results = [];
  for (const row of data) {
    const [{ data: document }, { data: version }] = await Promise.all([
      supabase
        .from("developer_agreement_documents")
        .select("title")
        .eq("id", row.document_id)
        .maybeSingle(),
      supabase
        .from("developer_agreement_versions")
        .select("version_label")
        .eq("id", row.version_id)
        .maybeSingle(),
    ]);
    results.push({
      id: row.id,
      title: document?.title ?? "Agreement",
      versionLabel: version?.version_label ?? "",
      status: row.status,
      signedAt: row.signed_at,
      companySignedAt: row.company_signed_at,
      canDownload: Boolean(row.executed_html_path),
      fullyExecuted: row.status === "fully_executed",
    });
  }
  return results;
}
