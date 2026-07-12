"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Store } from "lucide-react";
import { useState, useTransition } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { CategoryPill } from "@/components/vendors/VendorDetailDrawer";
import { VendorAddModal } from "@/components/vendors/VendorAddModal";
import {
  assignVendorToEventAction,
  removeVendorFromEventAction,
} from "@/lib/vendors/actions";
import { vendorInitials } from "@/lib/vendors/filters";
import type { EventVendorsData, VendorCategory } from "@/types/vendors";

interface EventVendorsSectionProps {
  eventId: string;
  data: EventVendorsData;
  categories: VendorCategory[];
  events: Array<{ id: string; title: string; date: string }>;
  availableVendors: Array<{ id: string; name: string }>;
}

export function EventVendorsSection({
  eventId,
  data,
  categories,
  events,
  availableVendors,
}: EventVendorsSectionProps) {
  const router = useRouter();
  const [addOpen, setAddOpen] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [selectedVendorId, setSelectedVendorId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const linkedIds = new Set(data.vendors.map((row) => row.vendor.id));
  const linkOptions = availableVendors.filter((vendor) => !linkedIds.has(vendor.id));

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
      router.refresh();
    });
  }

  function handleRemove(assignmentId: string) {
    startTransition(async () => {
      await removeVendorFromEventAction(assignmentId, eventId);
      router.refresh();
    });
  }

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Store className="h-4 w-4 text-cos-muted" strokeWidth={1.5} />
            <h3 className="font-display text-lg text-cos-text">Vendors</h3>
          </div>
          <p className="mt-1 text-sm text-cos-muted">
            Vendors connected to this event from your directory.
          </p>
        </div>
        {data.canWrite && (
          <div className="flex gap-2">
            <Button type="button" size="sm" variant="secondary" onClick={() => setLinkOpen(true)}>
              Add Existing
            </Button>
            <Button type="button" size="sm" onClick={() => setAddOpen(true)}>
              <Plus className="mr-1.5 h-4 w-4" />
              Create New
            </Button>
          </div>
        )}
      </div>

      {data.vendors.length === 0 ? (
        <p className="mt-4 text-sm text-cos-muted">
          No vendors linked yet. Add an existing vendor or create a new one.
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-cos-border border border-cos-border">
          {data.vendors.map((row) => (
            <li
              key={row.assignmentId}
              className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-cos-accent-soft text-xs font-semibold text-cos-dark">
                  {vendorInitials(row.vendor.name)}
                </span>
                <div className="min-w-0">
                  <Link
                    href={`/vendors/${row.vendor.id}`}
                    className="font-medium text-cos-text hover:underline"
                  >
                    {row.vendor.name}
                  </Link>
                  <p className="text-xs text-cos-muted">
                    {row.primaryContact?.name ?? row.vendor.phone ?? "No contact"}
                  </p>
                </div>
                {row.category && <CategoryPill category={row.category} />}
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={row.assignmentStatus === "confirmed" ? "success" : "warning"}>
                  {row.assignmentStatus}
                </Badge>
                {data.canWrite && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={pending}
                    onClick={() => handleRemove(row.assignmentId)}
                  >
                    Remove
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {error && (
        <p className="mt-3 text-sm text-red-600" role="alert">
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
        onCreated={() => router.refresh()}
      />
    </Card>
  );
}
