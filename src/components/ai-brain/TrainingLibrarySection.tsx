"use client";

import { useActionState, useState, useTransition } from "react";
import { FileText, Trash2, Upload } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { FileUpload } from "@/components/ui/FileUpload";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { TRAINING_DOCUMENT_TYPES } from "@/lib/organization-intelligence/constants";
import {
  deleteTrainingDocumentAction,
  uploadTrainingDocumentAction,
  type IntelligenceActionState,
} from "@/lib/organization-intelligence/actions";
import {
  formatFileSize,
  getTrainingDocumentTypeLabel,
} from "@/lib/organization-intelligence/mappers";
import type { OrganizationTrainingDocument } from "@/types/organization-intelligence";

const uploadInitialState: IntelligenceActionState = {
  error: null,
  success: false,
};

interface TrainingLibrarySectionProps {
  documents: OrganizationTrainingDocument[];
}

export function TrainingLibrarySection({ documents }: TrainingLibrarySectionProps) {
  const [uploadState, uploadAction, isUploading] = useActionState(
    uploadTrainingDocumentAction,
    uploadInitialState,
  );
  const [isDeleting, startDeleteTransition] = useTransition();
  const [deleteError, setDeleteError] = useState<string | null>(null);

  function handleDelete(documentId: string) {
    setDeleteError(null);
    startDeleteTransition(async () => {
      const result = await deleteTrainingDocumentAction(documentId);
      if (result.error) {
        setDeleteError(result.error);
      }
    });
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-cos-accent" />
            Add Training Material
          </CardTitle>
          <CardDescription>
            Upload past communications so Hey Ralli can learn your voice later.
            Metadata is saved now — AI analysis comes in a future release.
          </CardDescription>
        </CardHeader>

        <form action={uploadAction} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              name="title"
              label="Document Title"
              placeholder="Fall 2025 Book Fair Newsletter"
              required
            />
            <Select name="documentType" label="Document Type" required defaultValue="">
              <option value="" disabled>
                Select type
              </option>
              {TRAINING_DOCUMENT_TYPES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>

          <Textarea
            name="notes"
            label="Notes (optional)"
            placeholder="Used for our annual book fair — good example of volunteer CTA tone."
            rows={2}
          />

          <FileUpload
            name="trainingFile"
            label="Upload File"
            hint="PDF, DOCX, TXT, HTML, CSV, or ZIP · Max 25 MB"
            accept=".pdf,.doc,.docx,.txt,.html,.csv,.zip,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          />

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-h-5">
              {uploadState.error && (
                <p className="text-sm text-red-600" role="alert">
                  {uploadState.error}
                </p>
              )}
              {uploadState.success && !uploadState.error && (
                <p className="text-sm text-emerald-600">
                  Training document registered.
                </p>
              )}
            </div>
            <Button type="submit" disabled={isUploading} variant="secondary">
              <Upload className="h-4 w-4" />
              {isUploading ? "Uploading..." : "Add to Library"}
            </Button>
          </div>
        </form>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Training Library</CardTitle>
          <CardDescription>
            {documents.length === 0
              ? "No training documents yet. Upload newsletters, Facebook exports, and principal letters to build your voice library."
              : `${documents.length} document${documents.length === 1 ? "" : "s"} registered.`}
          </CardDescription>
        </CardHeader>

        {deleteError && (
          <p className="mb-4 text-sm text-red-600" role="alert">
            {deleteError}
          </p>
        )}

        {documents.length === 0 ? (
          <div className="rounded-xl border border-dashed border-cos-border bg-cos-bg px-6 py-10 text-center">
            <FileText className="mx-auto h-8 w-8 text-cos-dark-muted" />
            <p className="mt-3 text-sm font-medium text-cos-text">
              Your Training Library is empty
            </p>
            <p className="mt-1 text-sm text-cos-muted">
              Upload examples of how your school communicates today.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-cos-border">
            {documents.map((document) => (
              <li
                key={document.id}
                className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-start sm:justify-between"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-cos-text">{document.title}</p>
                    <Badge variant="default">
                      {getTrainingDocumentTypeLabel(document.documentType)}
                    </Badge>
                    <Badge
                      variant={
                        document.uploadStatus === "uploaded" ? "success" : "info"
                      }
                    >
                      {document.uploadStatus === "uploaded"
                        ? "Stored"
                        : "Metadata only"}
                    </Badge>
                  </div>
                  <p className="mt-1 truncate text-sm text-cos-muted">
                    {document.filename} · {formatFileSize(document.fileSize)}
                  </p>
                  {document.notes && (
                    <p className="mt-2 text-sm text-cos-muted">{document.notes}</p>
                  )}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={isDeleting}
                  onClick={() => handleDelete(document.id)}
                  className="shrink-0 self-start text-red-600 hover:bg-red-50 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4" />
                  Remove
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
