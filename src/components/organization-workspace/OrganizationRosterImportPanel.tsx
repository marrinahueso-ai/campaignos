"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FileUp, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  applyOrganizationRosterAction,
  previewOrganizationRosterAction,
  type OrganizationRosterPreviewResult,
} from "@/lib/organization-workspace/actions";
import type { ParsedRosterRole } from "@/lib/organization-workspace/parse-roster";

export function OrganizationRosterImportPanel() {
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
    <div className="rounded-xl border border-cos-border bg-cos-accent-soft/40 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-cos-text">Import roster</h3>
          <p className="mt-1 max-w-2xl text-sm text-cos-muted">
            Upload or paste your Position/Committee list. Top-level rows become
            leadership roles; indented rows become committees under the role
            above them. Use tabs between name and email.
          </p>
        </div>
      </div>

      <form action={handlePreview} className="mt-4 space-y-4">
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
            accept=".docx,.csv,.txt,.tsv,.pdf"
            className="block w-full text-sm text-cos-muted file:mr-4 file:rounded-lg file:border-0 file:bg-white file:px-4 file:py-2 file:text-sm file:font-medium file:text-cos-text hover:file:bg-cos-accent-soft"
          />
          <p className="mt-1 text-xs text-cos-muted">
            Word (.docx), CSV, TXT, TSV, or PDF
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
            placeholder={`President\tpresident@ptoees.org\n    BooHoo Yahoo Breakfast Chair\tboohoobreakfast@ptoees.org\nVP Events\tevents@ptoees.org\n    Book Fair Chair\tbookfair@ptoees.org`}
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
