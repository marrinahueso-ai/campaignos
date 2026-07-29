"use client";

import { Plus } from "lucide-react";
import { useState, useTransition } from "react";
import { useEventTabMutationRefresh } from "@/components/events-phase3/EventDetailTabInvalidation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { VendorAddModal } from "@/components/vendors/VendorAddModal";
import { VendorCard } from "@/components/vendors/VendorCard";
import { loadEventVendorDirectoryAction } from "@/lib/events-phase3/actions";
import {
  assignVendorToEventAction,
  removeVendorFromEventAction,
} from "@/lib/vendors/actions";
import type { EventVendorsData, VendorCategory } from "@/types/vendors";

interface EventVendorsSectionProps {
  eventId: string;
  data: EventVendorsData;
  categories: VendorCategory[];
  events: Array<{ id: string; title: string; date: string }>;
  availableVendors: Array<{ id: string; name: string }>;
  directoryHref?: string;
  /** When true, load directory picker only when Add Existing / Create New opens. */
  deferDirectoryLoad?: boolean;
}

export function EventVendorsSection({
  eventId,
  data,
  categories: initialCategories,
  events: initialEvents,
  availableVendors: initialAvailableVendors,
  directoryHref,
  deferDirectoryLoad = false,
}: EventVendorsSectionProps) {
  const refreshVendorsTab = useEventTabMutationRefresh("vendors");
  const [addOpen, setAddOpen] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [selectedVendorId, setSelectedVendorId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [directory, setDirectory] = useState({
    categories: initialCategories,
    events: initialEvents,
    availableVendors: initialAvailableVendors,
  });
  const [directoryLoaded, setDirectoryLoaded] = useState(
    () =>
      !deferDirectoryLoad ||
      initialAvailableVendors.length > 0 ||
      initialCategories.length > 0,
  );
  const [directoryLoading, setDirectoryLoading] = useState(false);

  const categories = directory.categories;
  const events = directory.events;
  const availableVendors = directory.availableVendors;

  const linkedIds = new Set(data.vendors.map((row) => row.vendor.id));
  const linkOptions = availableVendors.filter((vendor) => !linkedIds.has(vendor.id));

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
      const result = await assignVendorToEventAction(selectedVendorId, eventId, "pending");
      if (!result.success) {
        setError(result.error);
        return;
      }
      setLinkOpen(false);
      setSelectedVendorId("");
      await refreshVendorsTab();
    });
  }

  function handleRemove(assignmentId: string) {
    startTransition(async () => {
      await removeVendorFromEventAction(assignmentId, eventId);
      await refreshVendorsTab();
    });
  }

  return (
    <div className="space-y-4">
      {data.canWrite || directoryHref ? (
        <div className="flex flex-wrap justify-end gap-2">
          {directoryHref ? (
            <Button href={directoryHref} size="sm" variant="secondary">
              Open vendor directory
            </Button>
          ) : null}
          {data.canWrite ? (
            <>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                disabled={directoryLoading}
                onClick={() =>
                  ensureDirectoryLoaded(() => setLinkOpen(true))
                }
              >
                {directoryLoading ? "Loading…" : "Add Existing"}
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={directoryLoading}
                onClick={() =>
                  ensureDirectoryLoaded(() => setAddOpen(true))
                }
              >
                <Plus className="mr-1.5 h-4 w-4" />
                Create New
              </Button>
            </>
          ) : null}
        </div>
      ) : null}

      {data.vendors.length === 0 ? (
        <Card className="p-5">
          <p className="text-sm text-cos-muted">
            No vendors linked to this event yet. Add someone from your directory, or create a new vendor.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(14rem,16rem))] gap-3">
          {data.vendors.map((row) => (
            <VendorCard
              key={row.assignmentId}
              vendor={row.vendor}
              category={row.category}
              primaryContact={row.primaryContact}
              logoUrl={row.logoUrl}
              statusLabel={row.assignmentStatus}
              statusVariant={
                row.assignmentStatus === "confirmed" ? "success" : "warning"
              }
              canWrite={data.canWrite}
              pending={pending}
              eventId={eventId}
              onRemove={() => handleRemove(row.assignmentId)}
              onLogoUploaded={() => {
                void refreshVendorsTab();
              }}
            />
          ))}
        </div>
      )}

      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

      {linkOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-cos-text/25 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md border border-cos-border bg-cos-card p-6 shadow-2xl">
            <h4 className="font-display text-xl text-cos-text">Add Existing Vendor</h4>
            <p className="mt-1 text-sm text-cos-muted">
              Link a vendor from your directory to this event.
            </p>
            <select
              value={selectedVendorId}
              onChange={(event) => setSelectedVendorId(event.target.value)}
              className="mt-4 h-10 w-full border border-cos-border bg-cos-card px-3 text-sm"
            >
              <option value="">Select vendor</option>
              {linkOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name}
                </option>
              ))}
            </select>
            <div className="mt-4 flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setLinkOpen(false)}>
                Cancel
              </Button>
              <Button type="button" onClick={handleLinkExisting} disabled={pending}>
                Link Vendor
              </Button>
            </div>
          </div>
        </div>
      )}

      <VendorAddModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        categories={categories}
        events={events}
        defaultEventId={eventId}
        onCreated={() => {
          void refreshVendorsTab();
        }}
      />
    </div>
  );
}
