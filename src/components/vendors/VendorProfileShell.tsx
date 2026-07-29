"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FileText, History } from "lucide-react";
import { useEffect, useState, useTransition, type ReactNode } from "react";
import {
  VendorContactActions,
  VendorHeroContactActions,
} from "@/components/vendors/VendorContactActions";
import { VendorEditModal } from "@/components/vendors/VendorEditModal";
import { VendorLogoMark } from "@/components/vendors/VendorLogoMark";
import { VendorNotesPanel } from "@/components/vendors/VendorNotesPanel";
import {
  archiveVendorAction,
  blockVendorAction,
  deleteVendorAction,
  downloadVendorDocumentAction,
  toggleVendorFavoriteAction,
  unblockVendorAction,
} from "@/lib/vendors/actions";
import {
  resolveVendorContact,
  vendorStatusPill,
} from "@/lib/vendors/contact";
import type { VendorDetailData } from "@/types/vendors";
import { cn } from "@/lib/utils/cn";

type ProfileTab =
  | "overview"
  | "events"
  | "notes"
  | "documents"
  | "activity";

const TABS: Array<{ id: ProfileTab; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "events", label: "Events" },
  { id: "notes", label: "Notes" },
  { id: "documents", label: "Documents" },
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

  const primaryContact =
    data.contacts.find((contact) => contact.isPrimary) ?? data.contacts[0] ?? null;
  const contact = resolveVendorContact(data.vendor, primaryContact);
  const status = vendorStatusPill(data.vendor.status);
  const isBlocked = data.vendor.status === "blocked";

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

  return (
    <div className="relative overflow-hidden rounded-[22px] pb-12 before:pointer-events-none before:absolute before:top-0 before:left-[-2rem] before:h-60 before:w-60 before:rounded-full before:bg-[radial-gradient(circle,rgba(107,129,113,0.12),transparent_70%)] before:content-[''] after:pointer-events-none after:absolute after:top-10 after:right-0 after:h-52 after:w-52 after:rounded-full after:bg-[radial-gradient(circle,rgba(196,146,46,0.1),transparent_70%)] after:content-['']">
      <div className="relative space-y-4">
        <Link
          href="/vendors"
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-[13px] font-bold text-cos-muted no-underline transition hover:text-cos-text"
        >
          ← Back to directory
        </Link>

        <section className="overflow-hidden rounded-[22px] border border-cos-border bg-cos-card shadow-[0_8px_28px_rgba(28,36,48,0.06)]">
          <div
            className="h-[110px]"
            style={{
              background:
                "radial-gradient(ellipse 60% 80% at 10% 0%, rgba(107,129,113,0.35), transparent 60%), radial-gradient(ellipse 50% 70% at 90% 20%, rgba(196,146,46,0.28), transparent 55%), linear-gradient(180deg, #e8efe9, #fffcf7)",
            }}
            aria-hidden
          />
          <div className="relative mt-[-36px] px-6 pb-[22px]">
            <VendorLogoMark
              vendorId={data.vendor.id}
              vendorName={data.vendor.name}
              logoUrl={data.logoUrl}
              canWrite={data.canWrite}
              size="hero"
              disabled={pending}
              onLogoChange={() => router.refresh()}
            />

            <div className="mt-3 flex flex-wrap gap-1.5">
              {data.category ? (
                <span className="rounded-full bg-[rgba(47,74,60,0.12)] px-2.5 py-0.5 text-[11px] font-extrabold tracking-[0.04em] text-[#2f4a3c] uppercase">
                  {data.category.name}
                </span>
              ) : null}
              {status ? (
                <span
                  className={cn(
                    "rounded-full px-2.5 py-0.5 text-[11px] font-extrabold tracking-[0.04em] uppercase",
                    status.tone === "ok" &&
                      "bg-[rgba(42,122,134,0.12)] text-[#2a7a86]",
                    status.tone === "warn" &&
                      "bg-[rgba(196,146,46,0.16)] text-[#7a5a12]",
                    status.tone === "muted" &&
                      "bg-[rgba(42,38,34,0.08)] text-cos-muted",
                  )}
                >
                  {status.label}
                </span>
              ) : null}
            </div>

            <h1 className="mt-3.5 mb-1 font-display text-[clamp(1.75rem,4vw,2.375rem)] font-semibold tracking-[-0.02em] text-cos-text">
              {data.vendor.name}
            </h1>
            <p className="mb-3.5 text-sm text-cos-muted">
              {contact.leadLabel ?? "Add a contact on Edit to call or email faster."}
            </p>

            <VendorHeroContactActions contact={contact} />

            <div className="flex flex-wrap gap-2">
              {data.canWrite ? (
                <button
                  type="button"
                  onClick={() => setEditOpen(true)}
                  className="inline-flex items-center rounded-full border-[1.5px] border-cos-border bg-cos-card px-4 py-2.5 text-[13px] font-bold text-cos-text transition hover:-translate-y-px"
                >
                  Edit
                </button>
              ) : null}
              {data.canWrite ? (
                <button
                  type="button"
                  onClick={toggleFavorite}
                  disabled={pending}
                  className="inline-flex items-center rounded-full border-[1.5px] border-transparent px-3 py-2 text-[13px] font-bold text-cos-muted transition hover:text-cos-text disabled:opacity-50"
                >
                  {isFavorite ? "Favorited" : "Favorite"}
                </button>
              ) : null}
              {data.canWrite && !isBlocked ? (
                <button
                  type="button"
                  onClick={() => {
                    setBlockError(null);
                    setBlockOpen(true);
                  }}
                  className="inline-flex items-center rounded-full border-[1.5px] border-transparent px-3 py-2 text-[13px] font-bold text-cos-muted transition hover:text-cos-text"
                >
                  Block
                </button>
              ) : null}
              {data.canWrite && isBlocked ? (
                <button
                  type="button"
                  onClick={handleUnblock}
                  disabled={pending}
                  className="inline-flex items-center rounded-full border-[1.5px] border-transparent px-3 py-2 text-[13px] font-bold text-cos-muted transition hover:text-cos-text disabled:opacity-50"
                >
                  Unblock
                </button>
              ) : null}
              {data.canManage ? (
                <button
                  type="button"
                  onClick={handleArchive}
                  disabled={pending}
                  className="inline-flex items-center rounded-full border-[1.5px] border-transparent px-3 py-2 text-[13px] font-bold text-cos-muted transition hover:text-cos-text disabled:opacity-50"
                >
                  Archive
                </button>
              ) : null}
              {data.canManage ? (
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={pending}
                  className="inline-flex items-center rounded-full border-[1.5px] border-transparent px-3 py-2 text-[13px] font-bold text-cos-muted transition hover:text-[#a65a3a] disabled:opacity-50"
                >
                  Delete
                </button>
              ) : null}
            </div>
          </div>
        </section>

        <nav
          className="flex flex-wrap gap-0.5"
          role="tablist"
          aria-label="Vendor profile sections"
        >
          {TABS.map((item) => {
            const active = tab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setTab(item.id)}
                className={cn(
                  "rounded-full px-3.5 py-2 text-[13px] font-bold transition",
                  active
                    ? "border border-cos-border bg-cos-card text-cos-text shadow-[0_8px_28px_rgba(28,36,48,0.06)]"
                    : "border border-transparent bg-transparent text-cos-muted hover:text-cos-text",
                )}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {tab === "overview" && (
          <OverviewPanel data={data} contact={contact} />
        )}
        {tab === "events" && <EventsPanel assignments={data.assignments} />}
        {tab === "documents" && (
          <DocumentsPanel
            eventFiles={data.eventFiles}
            documents={data.documents}
            canWrite={data.canWrite}
          />
        )}
        {tab === "notes" && (
          <ProfileBox>
            <h3 className="m-0 mb-2.5 font-display text-xl font-semibold text-cos-text">
              Notes
            </h3>
            <VendorNotesPanel
              vendorId={data.vendor.id}
              notes={data.notes}
              summary={data.vendor.notesSummary}
              canWrite={data.canWrite}
            />
          </ProfileBox>
        )}
        {tab === "activity" && <ActivityPanel logs={data.activityLogs} />}

        {blockOpen ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-cos-text/25 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-[22px] border border-cos-border bg-cos-card p-6 shadow-[0_20px_48px_rgba(42,38,34,0.12)]">
              <h4 className="font-display text-xl font-semibold text-cos-text">
                Block vendor
              </h4>
              <p className="mt-1 text-sm text-cos-muted">
                Blocking requires a reason. It will be saved in Notes.
              </p>
              <textarea
                value={blockReason}
                onChange={(event) => setBlockReason(event.target.value)}
                rows={4}
                placeholder="Why is this vendor blocked?"
                className="mt-4 min-h-[6rem] w-full resize-y rounded-2xl border border-cos-border bg-cos-card px-3 py-2 text-sm text-cos-text placeholder:text-cos-muted focus:border-cos-text focus:outline-none"
              />
              {blockError ? (
                <p className="mt-2 text-sm text-[#a65a3a]" role="alert">
                  {blockError}
                </p>
              ) : null}
              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setBlockOpen(false);
                    setBlockReason("");
                    setBlockError(null);
                  }}
                  className="rounded-full px-4 py-2 text-[13px] font-bold text-cos-muted"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleBlock}
                  disabled={pending || !blockReason.trim()}
                  className="rounded-full bg-cos-text px-4 py-2 text-[13px] font-bold text-cos-card disabled:opacity-50"
                >
                  Block vendor
                </button>
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
    </div>
  );
}

function ProfileBox({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-[22px] border border-cos-border bg-cos-card px-[22px] py-5 shadow-[0_8px_28px_rgba(28,36,48,0.06)]",
        className,
      )}
    >
      {children}
    </div>
  );
}

function OverviewPanel({
  data,
  contact,
}: {
  data: VendorDetailData;
  contact: ReturnType<typeof resolveVendorContact>;
}) {
  const about =
    data.vendor.notesSummary?.trim() ||
    data.notes[0]?.content?.trim() ||
    "No notes yet. Add a summary from Edit, or jot a note under Notes.";

  return (
    <ProfileBox>
      <h3 className="m-0 mb-2.5 font-display text-xl font-semibold text-cos-text">
        About
      </h3>
      <p className="m-0 text-sm leading-relaxed text-cos-muted">{about}</p>
      <VendorContactActions contact={contact} className="mt-3.5" size="md" />
      <p className="mt-3.5 text-sm text-cos-muted">
        {data.assignments.length} event
        {data.assignments.length === 1 ? "" : "s"} ·{" "}
        {data.eventFiles.reduce((sum, group) => sum + group.files.length, 0)}{" "}
        file
        {data.eventFiles.reduce((sum, group) => sum + group.files.length, 0) ===
        1
          ? ""
          : "s"}{" "}
        across events
      </p>
    </ProfileBox>
  );
}

function EventsPanel({
  assignments,
}: {
  assignments: VendorDetailData["assignments"];
}) {
  if (!assignments.length) {
    return (
      <ProfileBox>
        <h3 className="m-0 mb-2.5 font-display text-xl font-semibold text-cos-text">
          Linked events
        </h3>
        <p className="m-0 text-sm text-cos-muted">No events linked yet.</p>
      </ProfileBox>
    );
  }

  return (
    <ProfileBox>
      <h3 className="m-0 mb-2.5 font-display text-xl font-semibold text-cos-text">
        Linked events
      </h3>
      <div className="mt-2 flex flex-col gap-2">
        {assignments.map((assignment) => (
          <Link
            key={assignment.assignmentId}
            href={`/events/${assignment.eventId}?tab=vendors`}
            className="flex items-center justify-between gap-3 rounded-[14px] bg-[rgba(255,252,247,0.7)] px-3.5 py-3 text-sm font-bold text-cos-text no-underline transition hover:bg-cos-card hover:shadow-[0_8px_28px_rgba(28,36,48,0.06)]"
          >
            <span>{assignment.eventTitle}</span>
            <small className="font-semibold text-cos-muted capitalize">
              {assignment.assignmentStatus === "confirmed" ||
              assignment.assignmentStatus === "completed"
                ? "Linked"
                : assignment.assignmentStatus}
            </small>
          </Link>
        ))}
      </div>
    </ProfileBox>
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
      <ProfileBox>
        <h3 className="m-0 mb-2.5 font-display text-xl font-semibold text-cos-text">
          Documents
        </h3>
        <p className="m-0 text-sm leading-relaxed text-cos-muted">
          {canWrite
            ? "Files for this vendor live on the events they’re linked to — open an event’s Files tab, or your team’s Files library filtered by that event."
            : "No documents on this vendor’s linked events yet."}
        </p>
      </ProfileBox>
    );
  }

  return (
    <div className="space-y-3.5">
      <ProfileBox>
        <h3 className="m-0 mb-2.5 font-display text-xl font-semibold text-cos-text">
          Documents
        </h3>
        <p className="m-0 text-sm text-cos-muted">
          Documents come from Files on linked events (including contracts). Open
          an event to upload or manage files.
        </p>
      </ProfileBox>

      {eventFiles.map((group) => (
        <ProfileBox key={group.eventId} className="!p-0 overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-cos-border px-5 py-3">
            <div>
              <Link
                href={`/events/${group.eventId}?tab=files`}
                className="font-bold text-cos-text no-underline hover:underline"
              >
                {group.eventTitle}
              </Link>
              <p className="text-xs text-cos-muted">{group.eventDate}</p>
            </div>
            <Link
              href={`/files?event=${group.eventId}`}
              className="rounded-full border-[1.5px] border-cos-border bg-cos-card px-3 py-1.5 text-xs font-bold text-cos-text no-underline"
            >
              Open in Files
            </Link>
          </div>
          {group.files.map((file) => (
            <div
              key={file.id}
              className="flex items-center gap-3 border-b border-cos-border px-5 py-3 last:border-b-0"
            >
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
          ))}
        </ProfileBox>
      ))}

      {hasLegacyDocs ? (
        <ProfileBox className="!p-0 overflow-hidden">
          <div className="border-b border-cos-border px-5 py-3">
            <p className="text-sm font-bold text-cos-text">Vendor uploads</p>
            <p className="text-xs text-cos-muted">
              Older files stored directly on the vendor record.
            </p>
          </div>
          {documents.map((document) => (
            <div
              key={document.id}
              className="flex items-center justify-between gap-3 border-b border-cos-border px-5 py-4 last:border-b-0"
            >
              <div className="flex items-center gap-3">
                <FileText className="h-4 w-4 text-cos-muted" />
                <div>
                  <p className="text-sm font-medium text-cos-text">
                    {document.name}
                  </p>
                  <p className="text-xs text-cos-muted">{document.documentType}</p>
                </div>
              </div>
              <button
                type="button"
                disabled={pending}
                onClick={() =>
                  startTransition(async () => {
                    const result = await downloadVendorDocumentAction(
                      document.id,
                    );
                    if (result.url) {
                      window.open(result.url, "_blank", "noopener,noreferrer");
                    }
                  })
                }
                className="rounded-full border-[1.5px] border-cos-border bg-cos-card px-3 py-1.5 text-xs font-bold text-cos-text disabled:opacity-50"
              >
                Download
              </button>
            </div>
          ))}
        </ProfileBox>
      ) : null}
    </div>
  );
}

function ActivityPanel({ logs }: { logs: VendorDetailData["activityLogs"] }) {
  if (!logs.length) {
    return (
      <ProfileBox>
        <h3 className="m-0 mb-2.5 font-display text-xl font-semibold text-cos-text">
          Activity
        </h3>
        <p className="m-0 text-sm text-cos-muted">No activity logged yet.</p>
      </ProfileBox>
    );
  }

  return (
    <ProfileBox className="!p-0 overflow-hidden">
      {logs.map((log) => (
        <div
          key={log.id}
          className="flex items-start gap-3 border-b border-cos-border px-5 py-4 last:border-b-0"
        >
          <History className="mt-0.5 h-4 w-4 shrink-0 text-cos-muted" />
          <div>
            <p className="text-sm text-cos-text">{log.action}</p>
            {log.details && (
              <p className="text-xs text-cos-muted">{log.details}</p>
            )}
            <p className="text-xs text-cos-muted">
              {log.actorName ?? "System"} ·{" "}
              {new Date(log.createdAt).toLocaleString()}
            </p>
          </div>
        </div>
      ))}
    </ProfileBox>
  );
}
