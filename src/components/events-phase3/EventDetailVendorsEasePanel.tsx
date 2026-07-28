"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import {
  EaseBtnPrimary,
  EaseBtnSecondary,
  EaseSoftActions,
} from "@/components/events-phase3/EventDetailEaseUi";
import { useEventTabMutationRefresh } from "@/components/events-phase3/EventDetailTabInvalidation";
import { VendorAddModal } from "@/components/vendors/VendorAddModal";
import { VendorContactActions } from "@/components/vendors/VendorContactActions";
import { loadEventVendorDirectoryAction } from "@/lib/events-phase3/actions";
import {
  assignVendorToEventAction,
  removeVendorFromEventAction,
} from "@/lib/vendors/actions";
import { resolveVendorContact } from "@/lib/vendors/contact";
import { cn } from "@/lib/utils/cn";
import type { EventVendorsData, VendorCategory } from "@/types/vendors";

function statusMeta(status: string): {
  label: string;
  pill: string;
  toneClass: string;
} {
  if (status === "confirmed" || status === "completed") {
    return {
      label: "Linked",
      pill: "Linked",
      toneClass: "bg-[rgba(42,122,134,0.12)] text-[#2a7a86]",
    };
  }
  if (status === "pending") {
    return {
      label: "Quote pending",
      pill: "Pending",
      toneClass: "bg-[rgba(196,146,46,0.16)] text-[#7a5a12]",
    };
  }
  if (status === "cancelled") {
    return {
      label: "Cancelled",
      pill: "Cancelled",
      toneClass: "bg-[rgba(166,90,58,0.12)] text-[#a65a3a]",
    };
  }
  return {
    label: status,
    pill: status,
    toneClass: "bg-[rgba(42,38,34,0.08)] text-cos-muted",
  };
}

export function EventDetailVendorsEasePanel({
  eventId,
  data,
  directoryHref = "/vendors",
}: {
  eventId: string;
  data: EventVendorsData;
  /** Full vendor directory (not event-scoped linked-only filter). */
  directoryHref?: string;
}) {
  const refreshVendorsTab = useEventTabMutationRefresh("vendors");
  const [addOpen, setAddOpen] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [selectedVendorId, setSelectedVendorId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [directory, setDirectory] = useState<{
    categories: VendorCategory[];
    events: Array<{ id: string; title: string; date: string }>;
    availableVendors: Array<{ id: string; name: string }>;
  }>({
    categories: [],
    events: [],
    availableVendors: [],
  });
  const [directoryLoaded, setDirectoryLoaded] = useState(false);
  const [directoryLoading, setDirectoryLoading] = useState(false);

  const linkedIds = new Set(data.vendors.map((row) => row.vendor.id));
  const linkOptions = directory.availableVendors.filter(
    (vendor) => !linkedIds.has(vendor.id),
  );

  function ensureDirectoryLoaded(onReady?: () => void) {
    if (directoryLoaded) {
      onReady?.();
      return;
    }

    setDirectoryLoading(true);
    setError(null);
    startTransition(async () => {
      const result = await loadEventVendorDirectoryAction();
      setDirectoryLoading(false);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setDirectory(result.data);
      setDirectoryLoaded(true);
      onReady?.();
    });
  }

  function handleLinkExisting() {
    if (!selectedVendorId) {
      setError("Select a vendor to link.");
      return;
    }

    setError(null);
    startTransition(async () => {
      const result = await assignVendorToEventAction(
        selectedVendorId,
        eventId,
        "pending",
      );
      if (!result.success) {
        setError(result.error);
        return;
      }
      setLinkOpen(false);
      setSelectedVendorId("");
      await refreshVendorsTab();
    });
  }

  function handleUnlink(assignmentId: string, vendorName: string) {
    if (
      !window.confirm(
        `Unlink “${vendorName}” from this event? Their directory profile stays.`,
      )
    ) {
      return;
    }

    setError(null);
    startTransition(async () => {
      const result = await removeVendorFromEventAction(assignmentId, eventId);
      if (!result.success) {
        setError(result.error);
        return;
      }
      await refreshVendorsTab();
    });
  }

  return (
    <section className="rounded-[22px] border border-cos-border bg-cos-card p-5 shadow-[0_8px_28px_rgba(28,36,48,0.06)]">
      <p className="mb-1.5 text-[11px] font-extrabold tracking-[0.08em] text-cos-muted uppercase">
        Event vendors
      </p>
      <h2 className="m-0 font-display text-[26px] font-semibold tracking-[-0.02em] text-cos-text">
        Who’s working this event
      </h2>
      <p className="mt-1 mb-[18px] text-sm text-cos-muted">
        Call, email, or open the full profile — contact stays on the row.
      </p>

      {data.vendors.length === 0 ? (
        <p className="mb-3.5 text-sm text-cos-muted">
          No vendors linked to this event yet.
          {data.canWrite
            ? " Add someone from your directory, or create a new vendor."
            : ""}
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {data.vendors.map((row) => {
            const contact = resolveVendorContact(row.vendor, row.primaryContact);
            const status = statusMeta(row.assignmentStatus);
            const metaParts = [
              row.category?.name ?? "Vendor",
              status.label,
              contact.name,
            ].filter(Boolean);

            return (
              <div
                key={row.assignmentId}
                className="grid grid-cols-1 items-center gap-3 rounded-2xl border border-transparent bg-[rgba(255,252,247,0.7)] px-3.5 py-3.5 transition hover:border-cos-border hover:bg-cos-card hover:shadow-[0_8px_28px_rgba(28,36,48,0.06)] sm:grid-cols-[1fr_auto]"
              >
                <div className="min-w-0">
                  <h4 className="m-0 font-display text-[17px] font-semibold text-cos-text">
                    {row.vendor.name}
                  </h4>
                  <p className="mt-1 mb-2 text-xs font-semibold text-cos-muted">
                    {metaParts.join(" · ")}
                  </p>
                  <VendorContactActions contact={contact} />
                </div>
                <div className="flex flex-row flex-wrap items-center gap-2 sm:flex-col sm:items-end">
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-0.5 text-[11px] font-extrabold tracking-[0.04em] uppercase",
                      status.toneClass,
                    )}
                  >
                    {status.pill}
                  </span>
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/vendors/${row.vendor.id}`}
                      className="inline-flex items-center justify-center rounded-full border-[1.5px] border-cos-border bg-cos-card px-4 py-2 text-[13px] font-bold text-cos-text no-underline transition hover:-translate-y-px"
                    >
                      Profile
                    </Link>
                    {data.canWrite ? (
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() =>
                          handleUnlink(row.assignmentId, row.vendor.name)
                        }
                        className="rounded-full px-3 py-2 text-[13px] font-bold text-cos-muted transition hover:text-cos-text disabled:opacity-50"
                      >
                        Unlink
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {error ? (
        <p className="mt-3 text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}

      <EaseSoftActions>
        {data.canWrite ? (
          <>
            <EaseBtnPrimary
              disabled={directoryLoading || pending}
              onClick={() => ensureDirectoryLoaded(() => setLinkOpen(true))}
            >
              {directoryLoading ? "Loading…" : "Add existing"}
            </EaseBtnPrimary>
            <EaseBtnSecondary
              disabled={directoryLoading || pending}
              onClick={() => ensureDirectoryLoaded(() => setAddOpen(true))}
            >
              Add new
            </EaseBtnSecondary>
          </>
        ) : null}
        <a
          href={directoryHref}
          className="inline-flex items-center gap-1.5 rounded-full border-[1.5px] border-transparent px-3 py-2 text-[13px] font-bold text-cos-muted transition hover:text-cos-text"
        >
          Browse directory
        </a>
      </EaseSoftActions>

      {linkOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-cos-text/25 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[22px] border border-cos-border bg-cos-card p-6 shadow-[0_20px_48px_rgba(28,36,48,0.16)]">
            <p className="mb-1 text-[11px] font-extrabold tracking-[0.08em] text-cos-muted uppercase">
              Link vendor
            </p>
            <h4 className="m-0 font-display text-xl font-semibold tracking-[-0.02em] text-cos-text">
              Add existing
            </h4>
            <p className="mt-1 text-sm text-cos-muted">
              Pick someone from your school directory who isn’t linked yet.
            </p>
            {linkOptions.length === 0 ? (
              <p className="mt-4 text-sm text-cos-muted">
                Every vendor in the directory is already on this event. Create a
                new one, or browse the full directory.
              </p>
            ) : (
              <select
                value={selectedVendorId}
                onChange={(event) => setSelectedVendorId(event.target.value)}
                className="mt-4 h-11 w-full rounded-full border-[1.5px] border-cos-border bg-[rgba(255,252,247,0.9)] px-4 text-sm font-semibold text-cos-text outline-none"
              >
                <option value="">Select vendor</option>
                {linkOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                  </option>
                ))}
              </select>
            )}
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <EaseBtnSecondary
                onClick={() => {
                  setLinkOpen(false);
                  setSelectedVendorId("");
                  setError(null);
                }}
              >
                Cancel
              </EaseBtnSecondary>
              {linkOptions.length > 0 ? (
                <EaseBtnPrimary
                  onClick={handleLinkExisting}
                  disabled={pending || !selectedVendorId}
                >
                  Link vendor
                </EaseBtnPrimary>
              ) : (
                <EaseBtnPrimary
                  onClick={() => {
                    setLinkOpen(false);
                    ensureDirectoryLoaded(() => setAddOpen(true));
                  }}
                >
                  Add new
                </EaseBtnPrimary>
              )}
            </div>
          </div>
        </div>
      ) : null}

      <VendorAddModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        categories={directory.categories}
        events={directory.events}
        defaultEventId={eventId}
        onCreated={() => {
          void refreshVendorsTab();
        }}
      />
    </section>
  );
}
