"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Archive,
  ArrowLeft,
  Ban,
  FileText,
  History,
  Pencil,
  ShieldCheck,
  Star,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { CategoryPill } from "@/components/vendors/VendorDetailDrawer";
import { VendorEditModal } from "@/components/vendors/VendorEditModal";
import { VendorNotesPanel } from "@/components/vendors/VendorNotesPanel";
import {
  archiveVendorAction,
  blockVendorAction,
  deleteVendorAction,
  downloadVendorDocumentAction,
  toggleVendorFavoriteAction,
  unblockVendorAction,
} from "@/lib/vendors/actions";
import { vendorInitials } from "@/lib/vendors/filters";
import type { VendorDetailData } from "@/types/vendors";
import { cn } from "@/lib/utils/cn";

type ProfileTab =
  | "overview"
  | "events"
  | "documents"
  | "notes"
  | "activity";

const TABS: Array<{ id: ProfileTab; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "events", label: "Events" },
  { id: "documents", label: "Documents" },
  { id: "notes", label: "Notes" },
  { id: "activity", label: "Activity" },
];

interface VendorProfileShellProps {
  data: VendorDetailData;
  categories: import("@/types/vendors").VendorCategory[];
}

export function VendorProfileShell({ data, categories }: VendorProfileShellProps) {
  const router = useRouter();
  const [tab, setTab] = useState<ProfileTab>("overview");
  const [editOpen, setEditOpen] = useState(false);
  const [blockOpen, setBlockOpen] = useState(false);
  const [blockReason, setBlockReason] = useState("");
  const [blockError, setBlockError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [isFavorite, setIsFavorite] = useState(data.vendor.isFavorite);

  useEffect(() => {
    setIsFavorite(data.vendor.isFavorite);
  }, [data.vendor.isFavorite]);

  function toggleFavorite() {
    if (!data.canWrite) return;
    const next = !isFavorite;
    setIsFavorite(next);
    startTransition(async () => {
      const result = await toggleVendorFavoriteAction(data.vendor.id, next);
      if (!result.success) {
        setIsFavorite(!next);
      }
      // No router.refresh — star is optimistic; server action revalidates for next visit.
    });
  }

  function handleArchive() {
    if (!confirm("Archive this vendor? Event history will be preserved.")) {
      return;
    }
    startTransition(async () => {
      const result = await archiveVendorAction(data.vendor.id);
      if (result.success) {
        router.push("/vendors");
      }
    });
  }

  function handleDelete() {
    if (
      !confirm(
        "Delete this vendor? They’ll be removed from the directory. You can’t undo this from the app.",
      )
    ) {
      return;
    }
    startTransition(async () => {
      const result = await deleteVendorAction(data.vendor.id);
      if (result.success) {
        router.push("/vendors");
      }
    });
  }

  function handleBlock() {
    setBlockError(null);
    startTransition(async () => {
      const result = await blockVendorAction(data.vendor.id, blockReason);
      if (!result.success) {
        setBlockError(result.error ?? "Unable to block vendor.");
        return;
      }
      setBlockOpen(false);
      setBlockReason("");
      setTab("notes");
      router.refresh();
    });
  }

  function handleUnblock() {
    startTransition(async () => {
      await unblockVendorAction(data.vendor.id);
      router.refresh();
    });
  }

  const isBlocked = data.vendor.status === "blocked";

  return (
    <div className="studio-page space-y-6 pb-12">
      <Link
        href="/vendors"
        className="inline-flex items-center gap-2 text-sm text-cos-muted hover:text-cos-text"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Vendor Directory
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-cos-accent-soft text-lg font-semibold text-cos-dark">
            {vendorInitials(data.vendor.name)}
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display text-4xl text-cos-text">{data.vendor.name}</h1>
              <div className="group/icon-action relative">
                <div
                  role="tooltip"
                  className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-2 -translate-x-1/2 whitespace-nowrap border border-cos-border bg-cos-card px-2 py-1 text-[11px] text-cos-text opacity-0 shadow-md transition-opacity duration-150 group-hover/icon-action:opacity-100 group-focus-within/icon-action:opacity-100"
                >
                  {isFavorite ? "Remove favorite" : "Add favorite"}
                </div>
                <button
                  type="button"
                  aria-label={isFavorite ? "Remove favorite" : "Add favorite"}
                  title={isFavorite ? "Remove favorite" : "Add favorite"}
                  onClick={toggleFavorite}
                  disabled={!data.canWrite}
                  className="text-cos-muted hover:text-cos-accent disabled:opacity-50"
                >
                  <Star
                    className={cn(
                      "h-5 w-5",
                      isFavorite && "fill-cos-accent text-cos-accent",
                    )}
                  />
                </button>
              </div>
            </div>
            {data.category && <CategoryPill category={data.category} />}
            <Badge
              variant={isBlocked ? "warning" : "default"}
              className="mt-2"
            >
              {data.vendor.status}
            </Badge>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {data.canWrite && (
            <IconActionButton
              label="Edit vendor"
              icon={Pencil}
              variant="primary"
              onClick={() => setEditOpen(true)}
            />
          )}
          {data.canWrite && !isBlocked && (
            <IconActionButton
              label="Block vendor"
              icon={Ban}
              onClick={() => {
                setBlockError(null);
                setBlockOpen(true);
              }}
            />
          )}
          {data.canWrite && isBlocked && (
            <IconActionButton
              label="Unblock vendor"
              icon={ShieldCheck}
              disabled={pending}
              onClick={handleUnblock}
            />
          )}
          {data.canManage && (
            <IconActionButton
              label="Archive vendor"
              icon={Archive}
              disabled={pending}
              onClick={handleArchive}
            />
          )}
          {data.canManage && (
            <IconActionButton
              label="Delete vendor"
              icon={Trash2}
              variant="danger"
              disabled={pending}
              onClick={handleDelete}
            />
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-1 border-b border-cos-border">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={cn(
              "px-4 py-2.5 text-sm transition-colors",
              tab === item.id
                ? "border-b-2 border-cos-dark font-medium text-cos-dark"
                : "text-cos-muted hover:text-cos-text",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === "overview" && <OverviewPanel data={data} />}
      {tab === "events" && <EventsPanel assignments={data.assignments} />}
      {tab === "documents" && (
        <DocumentsPanel
          eventFiles={data.eventFiles}
          documents={data.documents}
          canWrite={data.canWrite}
        />
      )}
      {tab === "notes" && (
        <VendorNotesPanel
          vendorId={data.vendor.id}
          notes={data.notes}
          summary={data.vendor.notesSummary}
          canWrite={data.canWrite}
        />
      )}
      {tab === "activity" && <ActivityPanel logs={data.activityLogs} />}

      {blockOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-cos-text/25 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md border border-cos-border bg-cos-card p-6 shadow-2xl">
            <h4 className="font-display text-xl text-cos-text">Block vendor</h4>
            <p className="mt-1 text-sm text-cos-muted">
              Blocking requires a reason. It will be saved in Notes.
            </p>
            <textarea
              value={blockReason}
              onChange={(event) => setBlockReason(event.target.value)}
              rows={4}
              placeholder="Why is this vendor blocked?"
              className="mt-4 min-h-[6rem] w-full resize-y border border-cos-border bg-cos-card px-3 py-2 text-sm text-cos-text placeholder:text-cos-muted focus:border-cos-dark focus:outline-none"
            />
            {blockError ? (
              <p className="mt-2 text-sm text-red-600" role="alert">
                {blockError}
              </p>
            ) : null}
            <div className="mt-4 flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setBlockOpen(false);
                  setBlockReason("");
                  setBlockError(null);
                }}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleBlock}
                disabled={pending || !blockReason.trim()}
              >
                Block vendor
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      <VendorEditModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        vendor={data.vendor}
        categories={categories}
        onSaved={() => router.refresh()}
      />
    </div>
  );
}

function OverviewPanel({ data }: { data: VendorDetailData }) {
  const contact = data.contacts[0];
  const title = contact?.title?.trim() || null;
  const name = contact?.name?.trim() || null;
  const showTitle =
    Boolean(title) && title!.toLowerCase() !== (name ?? "").toLowerCase();

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="space-y-3 p-5">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-cos-muted">
          Contact
        </h3>
        <p className="text-sm text-cos-text">
          {name ?? "—"}
          {showTitle ? `, ${title}` : ""}
        </p>
        <p className="text-sm text-cos-muted">{contact?.phone ?? data.vendor.phone ?? "—"}</p>
        <p className="text-sm text-cos-muted">{contact?.email ?? data.vendor.email ?? "—"}</p>
        <p className="text-sm text-cos-muted">{data.vendor.website ?? "—"}</p>
      </Card>
      <Card className="space-y-3 p-5">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-cos-muted">
          Summary
        </h3>
        <p className="text-sm leading-relaxed text-cos-text">
          {data.vendor.notesSummary ?? data.notes[0]?.content ?? "No notes yet."}
        </p>
        <p className="text-sm text-cos-muted">
          {data.assignments.length} event{data.assignments.length === 1 ? "" : "s"} ·{" "}
          {data.eventFiles.reduce((sum, group) => sum + group.files.length, 0)} file
          {data.eventFiles.reduce((sum, group) => sum + group.files.length, 0) === 1
            ? ""
            : "s"}{" "}
          across events
        </p>
      </Card>
    </div>
  );
}

function EventsPanel({
  assignments,
}: {
  assignments: VendorDetailData["assignments"];
}) {
  if (!assignments.length) {
    return <ShellEmpty message="No events linked yet." />;
  }

  return (
    <Card className="divide-y divide-cos-border p-0">
      {assignments.map((assignment) => (
        <div
          key={assignment.assignmentId}
          className="flex items-center justify-between gap-3 px-5 py-4"
        >
          <div>
            <Link
              href={`/events/${assignment.eventId}`}
              className="font-medium text-cos-text hover:underline"
            >
              {assignment.eventTitle}
            </Link>
            <p className="text-sm text-cos-muted">{assignment.eventDate}</p>
          </div>
          <Badge variant="success">{assignment.assignmentStatus}</Badge>
        </div>
      ))}
    </Card>
  );
}

function DocumentsPanel({
  eventFiles,
  documents,
  canWrite,
}: {
  eventFiles: VendorDetailData["eventFiles"];
  documents: VendorDetailData["documents"];
  canWrite: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const hasEventFiles = eventFiles.length > 0;
  const hasLegacyDocs = documents.length > 0;

  if (!hasEventFiles && !hasLegacyDocs) {
    return (
      <ShellEmpty
        message={
          canWrite
            ? "No documents yet. Upload files on an event’s Files tab — they show here for events this vendor is linked to. Contracts live with those event files."
            : "No documents for this vendor’s events."
        }
      />
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-cos-muted">
        Documents come from Files on linked events (including contracts). Open an event
        to upload or manage files.
      </p>

      {eventFiles.map((group) => (
        <Card key={group.eventId} className="divide-y divide-cos-border p-0">
          <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-3">
            <div>
              <Link
                href={`/events/${group.eventId}?tab=files`}
                className="font-medium text-cos-text hover:underline"
              >
                {group.eventTitle}
              </Link>
              <p className="text-xs text-cos-muted">{group.eventDate}</p>
            </div>
            <Button
              href={`/files?event=${group.eventId}`}
              size="sm"
              variant="secondary"
            >
              Open in Files
            </Button>
          </div>
          {group.files.map((file) => (
            <div
              key={file.id}
              className="flex items-center justify-between gap-3 px-5 py-3"
            >
              <div className="flex min-w-0 items-center gap-3">
                <FileText className="h-4 w-4 shrink-0 text-cos-muted" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-cos-text">
                    {file.name}
                  </p>
                  <p className="text-xs text-cos-muted">
                    {file.category} ·{" "}
                    {new Date(file.uploadedAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </Card>
      ))}

      {hasLegacyDocs ? (
        <Card className="divide-y divide-cos-border p-0">
          <div className="px-5 py-3">
            <p className="text-sm font-medium text-cos-text">Vendor uploads</p>
            <p className="text-xs text-cos-muted">
              Older files stored directly on the vendor record.
            </p>
          </div>
          {documents.map((document) => (
            <div
              key={document.id}
              className="flex items-center justify-between gap-3 px-5 py-4"
            >
              <div className="flex items-center gap-3">
                <FileText className="h-4 w-4 text-cos-muted" />
                <div>
                  <p className="text-sm font-medium text-cos-text">{document.name}</p>
                  <p className="text-xs text-cos-muted">{document.documentType}</p>
                </div>
              </div>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                disabled={pending}
                onClick={() =>
                  startTransition(async () => {
                    const result = await downloadVendorDocumentAction(document.id);
                    if (result.url) {
                      window.open(result.url, "_blank", "noopener,noreferrer");
                    }
                  })
                }
              >
                Download
              </Button>
            </div>
          ))}
        </Card>
      ) : null}
    </div>
  );
}

function ActivityPanel({ logs }: { logs: VendorDetailData["activityLogs"] }) {
  if (!logs.length) {
    return <ShellEmpty message="No activity logged yet." />;
  }

  return (
    <Card className="divide-y divide-cos-border p-0">
      {logs.map((log) => (
        <div key={log.id} className="flex items-start gap-3 px-5 py-4">
          <History className="mt-0.5 h-4 w-4 shrink-0 text-cos-muted" />
          <div>
            <p className="text-sm text-cos-text">{log.action}</p>
            {log.details && <p className="text-xs text-cos-muted">{log.details}</p>}
            <p className="text-xs text-cos-muted">
              {log.actorName ?? "System"} · {new Date(log.createdAt).toLocaleString()}
            </p>
          </div>
        </div>
      ))}
    </Card>
  );
}

function IconActionButton({
  label,
  icon: Icon,
  onClick,
  disabled,
  variant = "default",
}: {
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  disabled?: boolean;
  variant?: "default" | "primary" | "danger";
}) {
  return (
    <div className="group/icon-action relative">
      <div
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-2 -translate-x-1/2 whitespace-nowrap border border-cos-border bg-cos-card px-2 py-1 text-[11px] text-cos-text opacity-0 shadow-md transition-opacity duration-150 group-hover/icon-action:opacity-100 group-focus-within/icon-action:opacity-100"
      >
        {label}
      </div>
      <button
        type="button"
        aria-label={label}
        title={label}
        disabled={disabled}
        onClick={onClick}
        className={cn(
          "inline-flex h-9 w-9 items-center justify-center border transition-colors disabled:opacity-50",
          variant === "primary" &&
            "border-cos-dark bg-cos-dark text-white hover:bg-cos-dark/90",
          variant === "default" &&
            "border-cos-border bg-cos-card text-cos-text hover:border-cos-muted hover:bg-cos-bg",
          variant === "danger" &&
            "border-cos-border bg-cos-card text-cos-muted hover:border-red-300 hover:bg-red-50 hover:text-red-700",
        )}
      >
        <Icon className="h-4 w-4" aria-hidden />
      </button>
    </div>
  );
}

function ShellEmpty({ message }: { message: string }) {
  return (
    <Card className="p-8 text-center text-sm text-cos-muted">
      {message}
    </Card>
  );
}
