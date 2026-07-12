"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  FileText,
  History,
  Receipt,
  Star,
} from "lucide-react";
import { useState, useTransition } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { CategoryPill } from "@/components/vendors/VendorDetailDrawer";
import { VendorEditModal } from "@/components/vendors/VendorEditModal";
import {
  archiveVendorAction,
  downloadVendorDocumentAction,
  toggleVendorFavoriteAction,
} from "@/lib/vendors/actions";
import { vendorInitials } from "@/lib/vendors/filters";
import type { VendorDetailData } from "@/types/vendors";
import { cn } from "@/lib/utils/cn";

type ProfileTab =
  | "overview"
  | "events"
  | "documents"
  | "payments"
  | "notes"
  | "activity"
  | "contracts"
  | "communications"
  | "settings";

const TABS: Array<{ id: ProfileTab; label: string; shell?: boolean }> = [
  { id: "overview", label: "Overview" },
  { id: "events", label: "Events" },
  { id: "documents", label: "Documents" },
  { id: "payments", label: "Payments", shell: true },
  { id: "notes", label: "Notes" },
  { id: "activity", label: "Activity" },
  { id: "contracts", label: "Contracts", shell: true },
  { id: "communications", label: "Communications", shell: true },
  { id: "settings", label: "Settings", shell: true },
];

interface VendorProfileShellProps {
  data: VendorDetailData;
  categories: import("@/types/vendors").VendorCategory[];
}

export function VendorProfileShell({ data, categories }: VendorProfileShellProps) {
  const router = useRouter();
  const [tab, setTab] = useState<ProfileTab>("overview");
  const [editOpen, setEditOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function toggleFavorite() {
    startTransition(async () => {
      await toggleVendorFavoriteAction(data.vendor.id, !data.vendor.isFavorite);
      router.refresh();
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
              <button
                type="button"
                aria-label={data.vendor.isFavorite ? "Remove favorite" : "Add favorite"}
                onClick={toggleFavorite}
                disabled={!data.canWrite || pending}
                className="text-cos-muted hover:text-cos-accent disabled:opacity-50"
              >
                <Star
                  className={cn(
                    "h-5 w-5",
                    data.vendor.isFavorite && "fill-cos-accent text-cos-accent",
                  )}
                />
              </button>
            </div>
            {data.category && <CategoryPill category={data.category} />}
            <Badge variant="default" className="mt-2">
              {data.vendor.status}
            </Badge>
          </div>
        </div>
        <div className="flex gap-2">
          {data.canWrite && (
            <Button type="button" size="sm" onClick={() => setEditOpen(true)}>
              Edit Vendor
            </Button>
          )}
          {data.canManage && (
            <Button type="button" size="sm" variant="secondary" onClick={handleArchive}>
              Archive
            </Button>
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
            {item.shell ? " *" : ""}
          </button>
        ))}
      </div>

      {tab === "overview" && <OverviewPanel data={data} />}
      {tab === "events" && <EventsPanel assignments={data.assignments} />}
      {tab === "documents" && (
        <DocumentsPanel documents={data.documents} canWrite={data.canWrite} />
      )}
      {tab === "notes" && <NotesPanel notes={data.notes} summary={data.vendor.notesSummary} />}
      {tab === "activity" && <ActivityPanel logs={data.activityLogs} />}
      {tab !== "overview" &&
        tab !== "events" &&
        tab !== "documents" &&
        tab !== "notes" &&
        tab !== "activity" && <ShellPanel tab={tab} />}

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
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="space-y-3 p-5">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-cos-muted">
          Contact
        </h3>
        <p className="text-sm text-cos-text">
          {contact?.name ?? "—"}
          {contact?.title ? `, ${contact.title}` : ""}
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
          {data.documents.length} document{data.documents.length === 1 ? "" : "s"}
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
  documents,
  canWrite,
}: {
  documents: VendorDetailData["documents"];
  canWrite: boolean;
}) {
  const [pending, startTransition] = useTransition();

  if (!documents.length) {
    return (
      <ShellEmpty
        message={
          canWrite
            ? "No documents yet. Upload from the vendor directory actions (foundation in place)."
            : "No documents uploaded."
        }
      />
    );
  }

  return (
    <Card className="divide-y divide-cos-border p-0">
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
  );
}

function NotesPanel({
  notes,
  summary,
}: {
  notes: VendorDetailData["notes"];
  summary: string | null;
}) {
  if (!notes.length && !summary) {
    return <ShellEmpty message="No notes yet." />;
  }

  return (
    <Card className="space-y-4 p-5">
      {summary && !notes.length && (
        <p className="text-sm leading-relaxed text-cos-text">{summary}</p>
      )}
      {notes.map((note) => (
        <div key={note.id} className="border-l-2 border-cos-accent-soft pl-4">
          <p className="text-sm leading-relaxed text-cos-text">{note.content}</p>
          {note.createdByName && (
            <p className="mt-1 text-xs text-cos-muted">— {note.createdByName}</p>
          )}
        </div>
      ))}
    </Card>
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

function ShellPanel({ tab }: { tab: ProfileTab }) {
  const labels: Record<ProfileTab, string> = {
    overview: "Overview",
    events: "Events",
    documents: "Documents",
    payments: "Payments",
    notes: "Notes",
    activity: "Activity",
    contracts: "Contracts",
    communications: "Communications",
    settings: "Settings",
  };

  return (
    <Card className="flex flex-col items-center justify-center gap-3 p-12 text-center">
      <Receipt className="h-8 w-8 text-cos-muted" />
      <p className="font-display text-xl text-cos-text">{labels[tab]}</p>
      <p className="max-w-md text-sm text-cos-muted">
        This tab is a shell for the current release. Core vendor data lives in Overview,
        Events, Documents, Notes, and Activity.
      </p>
    </Card>
  );
}

function ShellEmpty({ message }: { message: string }) {
  return (
    <Card className="p-8 text-center text-sm text-cos-muted">
      {message}
    </Card>
  );
}
