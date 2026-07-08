import type { CampaignFileType } from "@/types/campaign-files";

const EXTENSION_TO_TYPE: Record<string, CampaignFileType> = {
  pdf: "pdf",
  docx: "docx",
  doc: "docx",
  xlsx: "xlsx",
  xls: "xlsx",
  png: "png",
  jpg: "jpg",
  jpeg: "jpg",
};

export function detectFileType(filename: string, mimeType?: string | null): CampaignFileType {
  const extension = filename.split(".").pop()?.toLowerCase() ?? "";
  if (extension && EXTENSION_TO_TYPE[extension]) {
    return EXTENSION_TO_TYPE[extension];
  }

  if (mimeType) {
    if (mimeType === "application/pdf") return "pdf";
    if (mimeType.includes("word")) return "docx";
    if (mimeType.includes("sheet") || mimeType.includes("excel")) return "xlsx";
    if (mimeType === "image/png") return "png";
    if (mimeType === "image/jpeg" || mimeType === "image/jpg") return "jpg";
  }

  return "other";
}

export function canConvertToPdf(fileType: CampaignFileType): boolean {
  return fileType === "pdf" || fileType === "png" || fileType === "jpg";
}

export function pdfFallbackMessage(fileType: CampaignFileType): string {
  if (fileType === "docx") {
    return "DOCX files download in their original format. PDF conversion is not available for Word documents yet.";
  }
  if (fileType === "xlsx") {
    return "XLSX files download in their original format. PDF conversion is not available for spreadsheets yet.";
  }
  if (fileType === "other") {
    return "This file downloads in its original format. PDF conversion is not available for this file type.";
  }
  return "";
}
