"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Download, FileUp, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  applyOrganizationRosterAction,
  previewOrganizationRosterAction,
  type OrganizationRosterPreviewResult,
} from "@/lib/organization-workspace/actions";
import type { ParsedRosterRole } from "@/lib/organization-workspace/parse-roster";
import { BOARD_ROSTER_IMPORT_TEMPLATE_PATH } from "@/lib/organization-workspace/roster-import-template";

interface OrganizationRosterImportPanelProps {
  /** Skip outer card chrome when embedded in Settings Ease. */
  embedded?: boolean;
}

export function OrganizationRosterImportPanel({
  embedded = false,
}: OrganizationRosterImportPanelProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [preview, setPreview] = useState<OrganizationRosterPreviewResult | null>(
    null,
  );
  const [applyMessage, setApplyMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handlePreview(formData: FormData) {
    startTransition(async () => {
      setApplyMessage(null);
      const result = await previewOrganizationRosterAction(formData);
      setPreview(result);
      setError(result.error);
    });
  }

  function handleApply(roles: ParsedRosterRole[]) {
    if (
      !window.confirm(
        `Import ${roles.length} leadership roles and replace all committees with the parsed list? Existing roles are matched by name and updated.`,
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
      setApplyMessage(
        `Imported ${result.roleCount ?? roles.length} roles and ${result.committeeCount ?? 0} committees.`,
      );
      setPreview(null);
      router.refresh();
    });
  }

  return (
    <div
      className={
        embedded
          ? undefined
          : "rounded-xl border border-cos-border bg-cos-accent-soft/40 p-5"
      }
    >
      {embedded ? null : (
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="font-semibold text-cos-text">Import roster</h3>
            <p className="mt-1 max-w-2xl text-sm text-cos-muted">
              Upload or paste your leadership and team list. Top-level rows
              become leadership roles; indented rows become teams under the role
              above them. Use tabs between name and email.
            </p>
          </div>
        </div>
      )}

      <form
        action={handlePreview}
        className={embedded ? "space-y-4" : "mt-4 space-y-4"}
      >
        <div className="flex flex-wrap items-center gap-3">
          <a
            href={BOARD_ROSTER_IMPORT_TEMPLATE_PATH}
            download
            className="inline-flex items-center gap-2 rounded-full border border-cos-border bg-white px-4 py-2 text-sm font-medium text-cos-text transition-colors hover:bg-cos-accent-soft"
          >
            <Download className="h-4 w-4" aria-hidden />
            Download Excel template
          </a>
          <p className="text-xs text-cos-muted">
            Columns: Position · Committee / Team · Prior year chair · Current
            year chair
          </p>
        </div>

        <div>
          <label
            htmlFor="rosterFile"
            className="mb-2 block text-sm font-medium text-cos-text"
          >
            Upload file
          </label>
          <input
            id="rosterFile"
            name="rosterFile"
            type="file"
            accept=".xlsx,.xls,.docx,.csv,.txt,.tsv,.pdf"
            className="block w-full text-sm text-cos-muted file:mr-4 file:rounded-lg file:border-0 file:bg-white file:px-4 file:py-2 file:text-sm file:font-medium file:text-cos-text hover:file:bg-cos-accent-soft"
          />
          <p className="mt-1 text-xs text-cos-muted">
            Excel (.xlsx) recommended. Word, CSV, TXT, TSV, or PDF also work.
          </p>
        </div>

        <div>
          <label
            htmlFor="rosterText"
            className="mb-2 block text-sm font-medium text-cos-text"
          >
            Or paste roster
          </label>
          <textarea
            id="rosterText"
            name="rosterText"
            rows={8}
            placeholder={`President\tAlex Morgan\n    Annual Gala\tMorgan Taylor\nVP Events\tSam Rivera\n    Community Festival\tJordan Kim`}
            className="w-full rounded-lg border border-cos-border bg-white px-3 py-2 text-sm text-cos-text shadow-sm focus:border-cos-border focus:outline-none focus:ring-2 focus:ring-cos-border"
          />
        </div>

        <Button type="submit" disabled={isPending}>
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Parsing…
            </>
          ) : (
            <>
              <FileUp className="mr-2 h-4 w-4" />
              Preview import
            </>
          )}
        </Button>
      </form>

      {error && !preview?.roles.length && (
        <p className="mt-3 text-sm text-red-600">{error}</p>
      )}

      {applyMessage && (
        <p className="mt-3 text-sm text-emerald-700">{applyMessage}</p>
      )}

      {preview && preview.roles.length > 0 && (
        <div className="mt-5 space-y-4 rounded-lg border border-cos-border bg-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-cos-text">
              Found{" "}
              <span className="font-semibold">{preview.roleCount}</span> roles and{" "}
              <span className="font-semibold">{preview.committeeCount}</span>{" "}
              committees
            </p>
            <Button
              type="button"
              disabled={isPending}
              onClick={() => handleApply(preview.roles)}
            >
              Apply import
            </Button>
          </div>

          <div className="max-h-80 space-y-4 overflow-y-auto text-sm">
            {preview.roles.map((role) => (
              <div key={role.name}>
                <p className="font-medium text-cos-text">
                  {role.name}
                  {role.contactEmail && (
                    <span className="ml-2 font-normal text-cos-muted">
                      {role.contactEmail}
                    </span>
                  )}
                </p>
                {role.committees.length > 0 && (
                  <ul className="mt-1 space-y-1 border-l-2 border-cos-border pl-4 text-cos-muted">
                    {role.committees.map((committee, index) => (
                      <li key={`${committee.name}-${index}`}>
                        {committee.name}
                        {committee.contactEmail && (
                          <span className="ml-2 text-cos-dark-muted">
                            {committee.contactEmail}
                          </span>
                        )}
                      </li>
                    ))}
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
