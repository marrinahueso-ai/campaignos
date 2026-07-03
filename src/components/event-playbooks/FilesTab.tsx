"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { FileText, Plus, Upload } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { addEventPlaybookFilePlaceholderAction } from "@/lib/event-playbooks/actions";
import type { EventPlaybookFile } from "@/types/event-playbooks";

interface FilesTabProps {
  eventId: string;
  files: EventPlaybookFile[];
  tablesAvailable: boolean;
}

export function FilesTab({ eventId, files, tablesAvailable }: FilesTabProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleAddPlaceholder() {
    setError(null);
    startTransition(async () => {
      const result = await addEventPlaybookFilePlaceholderAction(eventId, fileName);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setFileName("");
      router.refresh();
    });
  }

  if (!tablesAvailable) {
    return (
      <Card padding="lg">
        <CardHeader>
          <CardTitle>Files & documents</CardTitle>
          <CardDescription>
            Run migration 031_event_playbook_tables.sql to enable file tracking.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card padding="lg">
        <CardHeader>
          <CardTitle>Files & documents</CardTitle>
          <CardDescription>
            Vendor lists, contracts, and planning documents. File upload to storage
            coming soon — track filenames for now.
          </CardDescription>
        </CardHeader>

        <div className="mt-6 border border-dashed border-cos-border bg-cos-bg/50 p-8 text-center">
          <Upload className="mx-auto h-8 w-8 text-cos-muted" strokeWidth={1.5} />
          <p className="mt-3 text-sm text-cos-muted">
            Drag-and-drop upload will connect to Supabase Storage in a future release.
          </p>
        </div>

        <ul className="mt-6 space-y-2">
          {files.map((file) => (
            <li
              key={file.id}
              className="flex items-center gap-3 border border-cos-border bg-cos-bg px-4 py-3 text-sm"
            >
              <FileText className="h-4 w-4 shrink-0 text-cos-muted" />
              <span className="flex-1 text-cos-text">{file.name}</span>
              {file.url ? (
                <a
                  href={file.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-medium text-cos-accent hover:underline"
                >
                  Open
                </a>
              ) : (
                <span className="text-xs text-cos-muted">Pending upload</span>
              )}
            </li>
          ))}
          {files.length === 0 && (
            <li className="py-4 text-center text-sm text-cos-muted">
              No files tracked yet.
            </li>
          )}
        </ul>

        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <input
            type="text"
            value={fileName}
            onChange={(e) => setFileName(e.target.value)}
            placeholder="Track a document name…"
            className="flex-1 border border-cos-border bg-cos-card px-3 py-2 text-sm text-cos-text placeholder:text-cos-muted focus:border-cos-dark focus:outline-none"
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAddPlaceholder();
            }}
          />
          <Button
            type="button"
            onClick={handleAddPlaceholder}
            disabled={pending || !fileName.trim()}
            size="sm"
            variant="secondary"
          >
            <Plus className="h-4 w-4" />
            Add file
          </Button>
        </div>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </Card>
    </div>
  );
}
