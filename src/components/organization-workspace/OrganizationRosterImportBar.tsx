"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FileUp, Loader2, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  applyOrganizationRosterAction,
  clearAllOrganizationCommitteesAction,
  clearOrganizationRosterImportAction,
  previewOrganizationRosterAction,
  type OrganizationRosterPreviewResult,
} from "@/lib/organization-workspace/actions";
import type { ParsedRosterRole } from "@/lib/organization-workspace/parse-roster";
import { parseCommitteeChairNames } from "@/lib/organization-workspace/merge-committee-chairs";

interface OrganizationRosterImportBarProps {
  committeeCount: number;
  roleCount: number;
}

export function OrganizationRosterImportBar({
  committeeCount,
  roleCount,
}: OrganizationRosterImportBarProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();
  const [preview, setPreview] = useState<OrganizationRosterPreviewResult | null>(
    null,
  );
  const [applyMessage, setApplyMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);

  function handleFileSelected(file: File | null) {
    if (!file) {
      return;
    }

    setSelectedFileName(file.name);
    setApplyMessage(null);
    setError(null);

    const formData = new FormData();
    formData.set("rosterFile", file);

    startTransition(async () => {
      const result = await previewOrganizationRosterAction(formData);
      setPreview(result);
      setError(result.error);
    });
  }

  function handleApply(roles: ParsedRosterRole[]) {
    if (
      !window.confirm(
        `Import ${roles.length} leadership roles and replace all committees? Existing roles are matched by name.`,
      )
    ) {
      return;
    }

    startTransition(async () => {
      const result = await applyOrganizationRosterAction(roles);
      if (result.error) {
        setError(result.error);
        return;
      }

      setError(null);
      setPreview(null);
      setSelectedFileName(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      setApplyMessage(
        `Imported ${result.roleCount ?? roles.length} roles and ${result.committeeCount ?? 0} committees.`,
      );
      router.refresh();
    });
  }

  function handleClearCommittees() {
    if (
      !window.confirm(
        `Delete all ${committeeCount} committees? Leadership roles will stay.`,
      )
    ) {
      return;
    }

    startTransition(async () => {
      const result = await clearAllOrganizationCommitteesAction();
      if (result.error) {
        setError(result.error);
        return;
      }

      setError(null);
      setApplyMessage(`Removed ${result.deletedCount ?? 0} committees.`);
      router.refresh();
    });
  }

  function handleResetRoster() {
    if (
      !window.confirm(
        "Reset the entire roster? This deletes all roles and committees, then restores the default template so you can import again.",
      )
    ) {
      return;
    }

    startTransition(async () => {
      const result = await clearOrganizationRosterImportAction();
      if (result.error) {
        setError(result.error);
        return;
      }

      setError(null);
      setPreview(null);
      setApplyMessage(
        `Reset complete — removed ${result.deletedRoles ?? 0} roles and ${result.deletedCommittees ?? 0} committees.`,
      );
      router.refresh();
    });
  }

  return (
    <div className="cos-card bg-cos-bg/30">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-2xl">
          <h2 className="font-display text-2xl text-cos-text">Upload roster</h2>
          <p className="mt-1 text-sm text-cos-muted">
            Upload your Position/Committee Excel file (.xlsx).{" "}
            <strong>Bold rows in column A</strong> are VP roles; committees in
            column B stack under each VP until the next bold row. Chair names
            come from the latest year column.
          </p>
          <p className="mt-2 text-xs text-cos-muted">
            PDF and Word exports also work, but the original .xlsx gives the
            most accurate grouping.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".docx,.csv,.txt,.tsv,.pdf,.xlsx,.xls"
            className="hidden"
            onChange={(event) =>
              handleFileSelected(event.target.files?.[0] ?? null)
            }
          />
          <Button
            type="button"
            disabled={isPending}
            onClick={() => fileInputRef.current?.click()}
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Reading file…
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Upload roster
              </>
            )}
          </Button>
        </div>
      </div>

      {(committeeCount > 0 || roleCount > 0) && (
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-cos-border pt-4">
          <span className="text-sm text-cos-muted">
            Current roster: {roleCount} roles, {committeeCount} committees
          </span>
          {committeeCount > 0 && (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={isPending}
              onClick={handleClearCommittees}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete all committees
            </Button>
          )}
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={isPending}
            onClick={handleResetRoster}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Reset entire roster
          </Button>
        </div>
      )}

      {selectedFileName && (
        <p className="mt-3 text-sm text-cos-muted">
          <FileUp className="mr-1 inline h-4 w-4" />
          {selectedFileName}
        </p>
      )}

      {error && !preview?.roles.length && (
        <p className="mt-3 text-sm text-red-600">{error}</p>
      )}

      {applyMessage && (
        <p className="mt-3 text-sm text-emerald-700">{applyMessage}</p>
      )}

      {preview && preview.roles.length > 0 && (
        <div className="mt-4 space-y-3 rounded-lg border border-cos-border bg-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-cos-text">
              Found{" "}
              <span className="font-semibold">{preview.roleCount}</span> roles and{" "}
              <span className="font-semibold">{preview.committeeCount}</span>{" "}
              committees
            </p>
            <Button
              type="button"
              size="sm"
              disabled={isPending}
              onClick={() => handleApply(preview.roles)}
            >
              Apply import
            </Button>
          </div>

          <div className="max-h-64 space-y-4 overflow-y-auto text-sm">
            {preview.roles.map((role) => (
              <div key={role.name}>
                <p className="font-medium text-cos-text">
                  {role.name}
                  {role.contactName ? (
                    <span className="font-normal text-cos-muted">
                      {" "}
                      · {role.contactName}
                    </span>
                  ) : null}
                </p>
                {role.committees.length > 0 && (
                  <ul className="mt-1 space-y-0.5 pl-3 text-cos-muted">
                    {role.committees.slice(0, 4).map((committee) => {
                      const chairs = parseCommitteeChairNames(committee.contactName);
                      return (
                        <li key={committee.name}>
                          {committee.name}
                          {chairs.length > 0 ? ` — ${chairs.join(", ")}` : ""}
                        </li>
                      );
                    })}
                    {role.committees.length > 4 && (
                      <li className="text-cos-dark-muted">
                        + {role.committees.length - 4} more
                      </li>
                    )}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
