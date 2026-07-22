"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import mammoth from "mammoth";
import { getAuthUser } from "@/lib/auth/queries";
import { getActiveMembership } from "@/lib/auth/membership-queries";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient, isSupabaseAdminConfigured } from "@/lib/supabase/admin";
import { canManageDeveloperAgreements } from "@/lib/developer-agreements/access";
import { ensureDeveloperAgreementsSeeded } from "@/lib/developer-agreements/ensure-seed";
import {
  DEVELOPER_AGREEMENTS_MANAGE_PATH,
  DEVELOPER_AGREEMENTS_PATH,
  getDeveloperAgreementSigningProgress,
} from "@/lib/developer-agreements/queries";
import { DEVELOPER_AGREEMENTS_COUNTERSIGN_PATH } from "@/lib/developer-agreements/gate";

export type AgreementActionState = {
  error: string | null;
  success: boolean;
};

function clientIp(headerStore: Headers): string | null {
  const forwarded = headerStore.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || null;
  }
  return headerStore.get("x-real-ip");
}

function dataUrlToBytes(dataUrl: string): { bytes: Uint8Array; contentType: string } | null {
  const match = /^data:(image\/(?:png|jpeg|webp));base64,(.+)$/i.exec(dataUrl.trim());
  if (!match) return null;
  const contentType = match[1].toLowerCase();
  const buffer = Buffer.from(match[2], "base64");
  if (buffer.byteLength < 200 || buffer.byteLength > 1_500_000) {
    return null;
  }
  return { bytes: new Uint8Array(buffer), contentType };
}

export async function signDeveloperAgreementAction(
  _prev: AgreementActionState,
  formData: FormData,
): Promise<AgreementActionState> {
  const user = await getAuthUser();
  if (!user) {
    return { error: "You must be signed in to sign agreements.", success: false };
  }

  const versionId = String(formData.get("versionId") ?? "").trim();
  const documentId = String(formData.get("documentId") ?? "").trim();
  const typedLegalName = String(formData.get("typedLegalName") ?? "").trim();
  const confirmation = String(formData.get("confirmation") ?? "");
  const signatureDataUrl = String(formData.get("signatureDataUrl") ?? "").trim();
  const scrolledComplete = String(formData.get("scrolledComplete") ?? "") === "true";

  if (!versionId || !documentId) {
    return { error: "Missing agreement version.", success: false };
  }
  if (!scrolledComplete) {
    return {
      error: "Scroll to the bottom of the agreement before signing.",
      success: false,
    };
  }
  if (confirmation !== "on" && confirmation !== "true") {
    return {
      error: "Confirm that you have read and agree to the complete terms.",
      success: false,
    };
  }
  if (typedLegalName.length < 2) {
    return { error: "Enter your full legal name.", success: false };
  }

  const parsedSignature = dataUrlToBytes(signatureDataUrl);
  if (!parsedSignature) {
    return {
      error: "Draw your signature in the signature box.",
      success: false,
    };
  }

  const progress = await getDeveloperAgreementSigningProgress(user.id);
  const target = progress.documents.find(
    (doc) => doc.id === documentId && doc.version.id === versionId,
  );
  if (!target) {
    return { error: "This agreement is not required for your account.", success: false };
  }
  if (target.signed) {
    return { error: null, success: true };
  }

  const supabase = await createClient();
  const membership = await getActiveMembership();
  const ext =
    parsedSignature.contentType === "image/jpeg"
      ? "jpg"
      : parsedSignature.contentType === "image/webp"
        ? "webp"
        : "png";
  const signaturePath = `signatures/${user.id}/${versionId}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("developer-agreements")
    .upload(signaturePath, parsedSignature.bytes, {
      contentType: parsedSignature.contentType,
      upsert: true,
    });

  if (uploadError) {
    console.error("signature upload failed:", uploadError.message);
    return {
      error: "Could not store your drawn signature. Try again.",
      success: false,
    };
  }

  const headerStore = await headers();
  const { data: inserted, error: insertError } = await supabase
    .from("developer_agreement_signatures")
    .insert({
      user_id: user.id,
      organization_user_id: membership?.user.id ?? null,
      document_id: documentId,
      version_id: versionId,
      typed_legal_name: typedLegalName,
      signature_image_path: signaturePath,
      ip_address: clientIp(headerStore),
      user_agent: headerStore.get("user-agent"),
      status: "awaiting_company",
    })
    .select("id")
    .single();

  if (insertError || !inserted) {
    console.error("signature insert failed:", insertError?.message);
    return {
      error: insertError?.message.includes("duplicate")
        ? "You already signed this version."
        : "Could not save your signature. Try again.",
      success: false,
    };
  }

  // Store populated packet (developer fields filled; company pending) + notify owners.
  try {
    const { buildAndStoreExecutedPacket, notifyOwnersDeveloperSigned } =
      await import("@/lib/developer-agreements/packet");
    await buildAndStoreExecutedPacket(inserted.id);
    await notifyOwnersDeveloperSigned({
      signatureId: inserted.id,
      developerName: typedLegalName,
      developerEmail: user.email,
      documentTitle: target.title,
      versionLabel: target.version.versionLabel,
    });
  } catch (error) {
    console.error("post-sign packet/notify failed:", error);
  }

  const nextProgress = await getDeveloperAgreementSigningProgress(user.id);
  if (nextProgress.mustSign) {
    redirect(`${DEVELOPER_AGREEMENTS_PATH}?signed=1`);
  }

  redirect(`${DEVELOPER_AGREEMENTS_PATH}?complete=1`);
}

export async function seedDeveloperAgreementsAction(): Promise<AgreementActionState> {
  if (!(await canManageDeveloperAgreements())) {
    return { error: "Only Hey Ralli owners can manage agreements.", success: false };
  }
  const result = await ensureDeveloperAgreementsSeeded();
  if (!result.ok) {
    return { error: result.message ?? "Seed failed.", success: false };
  }
  return { error: null, success: true };
}

export async function publishDeveloperAgreementVersionAction(
  _prev: AgreementActionState,
  formData: FormData,
): Promise<AgreementActionState> {
  if (!(await canManageDeveloperAgreements())) {
    return { error: "Only Hey Ralli owners can manage agreements.", success: false };
  }
  if (!isSupabaseAdminConfigured()) {
    return {
      error: "SUPABASE_SERVICE_ROLE_KEY is required to publish agreements.",
      success: false,
    };
  }

  const documentId = String(formData.get("documentId") ?? "").trim();
  const versionLabel = String(formData.get("versionLabel") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const slug = String(formData.get("slug") ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-");
  const file = formData.get("file");

  if (!versionLabel) {
    return { error: "Version label is required (e.g. NDA-2026-02).", success: false };
  }

  let bodyHtml = String(formData.get("bodyHtml") ?? "").trim();
  let sourceFilename: string | null = null;
  let storagePath: string | null = null;

  if (file instanceof File && file.size > 0) {
    sourceFilename = file.name;
    const buffer = Buffer.from(await file.arrayBuffer());
    const lower = file.name.toLowerCase();
    if (lower.endsWith(".docx")) {
      const converted = await mammoth.convertToHtml({ buffer });
      bodyHtml = converted.value?.trim() || bodyHtml;
    } else if (lower.endsWith(".html") || lower.endsWith(".htm")) {
      bodyHtml = buffer.toString("utf8");
    } else if (lower.endsWith(".txt")) {
      const text = buffer.toString("utf8");
      bodyHtml = text
        .split(/\n{2,}/)
        .map((block) => `<p>${escapeHtml(block.trim()).replace(/\n/g, "<br/>")}</p>`)
        .join("\n");
    } else {
      return {
        error: "Upload a .docx, .html, or .txt file (PDF preview later).",
        success: false,
      };
    }

    if (isSupabaseAdminConfigured()) {
      const admin = createAdminClient();
      const path = `templates/${slug || documentId || "doc"}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await admin.storage
        .from("developer-agreements")
        .upload(path, buffer, {
          contentType: file.type || "application/octet-stream",
          upsert: false,
        });
      if (!uploadError) {
        storagePath = path;
      }
    }
  }

  if (!bodyHtml) {
    return {
      error: "Agreement body is empty. Upload a document or paste HTML.",
      success: false,
    };
  }

  const admin = createAdminClient();
  const user = await getAuthUser();

  let resolvedDocumentId = documentId;
  if (!resolvedDocumentId) {
    if (!slug || !title) {
      return {
        error: "New documents need a slug and title.",
        success: false,
      };
    }
    const { data: created, error: createError } = await admin
      .from("developer_agreement_documents")
      .insert({
        slug,
        title,
        description,
        sort_order: 100,
        required_for_roles: ["developer"],
        is_active: true,
      })
      .select("id")
      .single();
    if (createError || !created) {
      return {
        error: createError?.message ?? "Could not create document.",
        success: false,
      };
    }
    resolvedDocumentId = created.id;
  } else if (title || description) {
    await admin
      .from("developer_agreement_documents")
      .update({
        ...(title ? { title } : {}),
        ...(description ? { description } : {}),
        updated_at: new Date().toISOString(),
      })
      .eq("id", resolvedDocumentId);
  }

  const { data: version, error: versionError } = await admin
    .from("developer_agreement_versions")
    .insert({
      document_id: resolvedDocumentId,
      version_label: versionLabel,
      body_html: bodyHtml,
      source_filename: sourceFilename,
      storage_path: storagePath,
      is_published: true,
      created_by: user?.id ?? null,
      effective_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (versionError || !version) {
    return {
      error: versionError?.message ?? "Could not publish version.",
      success: false,
    };
  }

  const { error: linkError } = await admin
    .from("developer_agreement_documents")
    .update({
      current_version_id: version.id,
      updated_at: new Date().toISOString(),
      is_active: true,
    })
    .eq("id", resolvedDocumentId);

  if (linkError) {
    return { error: linkError.message, success: false };
  }

  redirect(`${DEVELOPER_AGREEMENTS_MANAGE_PATH}?published=1`);
}

export async function countersignCompanyAgreementAction(
  _prev: AgreementActionState,
  formData: FormData,
): Promise<AgreementActionState> {
  if (!(await canManageDeveloperAgreements())) {
    return { error: "Only Hey Ralli owners can counter-sign.", success: false };
  }
  if (!isSupabaseAdminConfigured()) {
    return {
      error: "SUPABASE_SERVICE_ROLE_KEY is required to counter-sign.",
      success: false,
    };
  }

  const user = await getAuthUser();
  if (!user) {
    return { error: "You must be signed in.", success: false };
  }

  const signatureId = String(formData.get("signatureId") ?? "").trim();
  const typedLegalName = String(formData.get("typedLegalName") ?? "").trim();
  const title = String(formData.get("companyTitle") ?? "").trim() ||
    "Authorized Representative";
  const confirmation = String(formData.get("confirmation") ?? "");
  const signatureDataUrl = String(formData.get("signatureDataUrl") ?? "").trim();
  const scrolledComplete = String(formData.get("scrolledComplete") ?? "") === "true";

  if (!signatureId) {
    return { error: "Missing signature record.", success: false };
  }
  if (!scrolledComplete) {
    return {
      error: "Scroll to the bottom of the agreement before signing.",
      success: false,
    };
  }
  if (confirmation !== "on" && confirmation !== "true") {
    return {
      error: "Confirm that you have read and agree to the complete terms.",
      success: false,
    };
  }
  if (typedLegalName.length < 2) {
    return { error: "Enter your full legal name.", success: false };
  }

  const parsedSignature = dataUrlToBytes(signatureDataUrl);
  if (!parsedSignature) {
    return {
      error: "Draw your signature in the signature box.",
      success: false,
    };
  }

  const admin = createAdminClient();
  const { data: existing, error: loadError } = await admin
    .from("developer_agreement_signatures")
    .select("id, status, user_id, version_id, document_id, typed_legal_name")
    .eq("id", signatureId)
    .maybeSingle();

  if (loadError || !existing) {
    return { error: "Signature record not found.", success: false };
  }
  if (existing.status === "fully_executed") {
    redirect(`${DEVELOPER_AGREEMENTS_COUNTERSIGN_PATH}?done=1`);
  }

  const ext =
    parsedSignature.contentType === "image/jpeg"
      ? "jpg"
      : parsedSignature.contentType === "image/webp"
        ? "webp"
        : "png";
  const companyPath = `signatures/company/${signatureId}.${ext}`;
  const uploaded = await admin.storage
    .from("developer-agreements")
    .upload(companyPath, parsedSignature.bytes, {
      contentType: parsedSignature.contentType,
      upsert: true,
    });
  if (uploaded.error) {
    return {
      error: "Could not store company signature. Try again.",
      success: false,
    };
  }

  const headerStore = await headers();
  const now = new Date().toISOString();
  const { error: updateError } = await admin
    .from("developer_agreement_signatures")
    .update({
      status: "fully_executed",
      company_signer_user_id: user.id,
      company_typed_legal_name: typedLegalName,
      company_title: title,
      company_signature_image_path: companyPath,
      company_signed_at: now,
      company_ip_address: clientIp(headerStore),
      company_user_agent: headerStore.get("user-agent"),
    })
    .eq("id", signatureId);

  if (updateError) {
    return { error: updateError.message, success: false };
  }

  await admin.from("developer_agreement_company_profile").upsert({
    id: 1,
    legal_name: typedLegalName,
    title,
    email: user.email,
    signature_image_path: companyPath,
    updated_at: now,
    updated_by: user.id,
  });

  const {
    buildAndStoreExecutedPacket,
    emailExecutedAgreementCopy,
  } = await import("@/lib/developer-agreements/packet");

  const packet = await buildAndStoreExecutedPacket(signatureId);
  if ("error" in packet) {
    return {
      error: `Signed, but could not build executed copy: ${packet.error}`,
      success: false,
    };
  }

  const { data: authUser } = await admin.auth.admin.getUserById(existing.user_id);
  const { data: document } = await admin
    .from("developer_agreement_documents")
    .select("title")
    .eq("id", existing.document_id)
    .maybeSingle();
  const { data: version } = await admin
    .from("developer_agreement_versions")
    .select("version_label")
    .eq("id", existing.version_id)
    .maybeSingle();

  await emailExecutedAgreementCopy({
    signatureId,
    html: packet.html,
    documentTitle: document?.title ?? "Agreement",
    versionLabel: version?.version_label ?? "",
    developerEmail: authUser.user?.email ?? "",
    developerName: existing.typed_legal_name,
  });

  redirect(`${DEVELOPER_AGREEMENTS_COUNTERSIGN_PATH}?done=1`);
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
