"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Camera, ExternalLink, Mail, Phone, Plus, Store } from "lucide-react";
import { useRef, useState, useTransition } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { CategoryPill } from "@/components/vendors/VendorDetailDrawer";
import { VendorAddModal } from "@/components/vendors/VendorAddModal";
import {
  assignVendorToEventAction,
  removeVendorFromEventAction,
  uploadVendorLogoAction,
} from "@/lib/vendors/actions";
import { formatVendorWebsite, vendorInitials } from "@/lib/vendors/filters";
import type { EventVendorRow, EventVendorsData, VendorCategory } from "@/types/vendors";

interface EventVendorsSectionProps {
  eventId: string;
  data: EventVendorsData;
  categories: VendorCategory[];
  events: Array<{ id: string; title: string; date: string }>;
  availableVendors: Array<{ id: string; name: string }>;
  directoryHref?: string;
}

function formatAddress(vendor: EventVendorRow["vendor"]): string | null {
  const line = [vendor.addressLine1, vendor.city, vendor.state, vendor.postalCode]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(", ");
  return line || null;
}

function EventVendorCard({
  row,
  eventId,
  canWrite,
  pending,
  onRemove,
  onLogoUploaded,
}: {
  row: EventVendorRow;
  eventId: string;
  canWrite: boolean;
  pending: boolean;
  onRemove: (assignmentId: string) => void;
  onLogoUploaded: () => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [logoError, setLogoError] = useState<string | null>(null);
  const [uploading, startUpload] = useTransition();
  const contactName = row.primaryContact?.name ?? null;
  const contactEmail = row.primaryContact?.email ?? row.vendor.email;
  const contactPhone = row.primaryContact?.phone ?? row.vendor.phone;
  const website = formatVendorWebsite(row.vendor.website);
  const address = formatAddress(row.vendor);

  function handleLogoChange(fileList: FileList | null) {
    const file = fileList?.[0];
    if (!file) {
      return;
    }

    setLogoError(null);
    startUpload(async () => {
      const formData = new FormData();
      formData.set("vendorId", row.vendor.id);
      formData.set("eventId", eventId);
      formData.set("file", file);
      const result = await uploadVendorLogoAction(formData);
      if (!result.success) {
        setLogoError(result.error ?? "Unable to upload logo.");
        return;
      }
      onLogoUploaded();
    });
  }

  return (
    <Card padding="none" className="flex h-full flex-col overflow-hidden border border-cos-border">
      <div className="relative flex h-24 items-center justify-center bg-cos-bg">
        {row.logoUrl ? (
          <Image
            src={row.logoUrl}
            alt={`${row.vendor.name} logo`}
            fill
            className="object-contain p-2.5"
            sizes="220px"
            unoptimized
          />
        ) : (
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-cos-accent-soft text-sm font-semibold text-cos-dark">
            {vendorInitials(row.vendor.name)}
          </span>
        )}
        {canWrite && (
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp"
              className="hidden"
              onChange={(event) => {
                handleLogoChange(event.target.files);
                event.target.value = "";
              }}
            />
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="absolute bottom-2 right-2 h-7 px-2 text-xs"
              disabled={uploading || pending}
              onClick={() => fileInputRef.current?.click()}
            >
              <Camera className="mr-1 h-3 w-3" />
              {uploading ? "Uploading…" : row.logoUrl ? "Change logo" : "Add logo"}
            </Button>
          </>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <Link
              href={`/vendors/${row.vendor.id}`}
              className="font-display text-base leading-snug text-cos-text hover:underline"
            >
              {row.vendor.name}
            </Link>
            {row.category && (
              <div className="mt-1">
                <CategoryPill category={row.category} />
              </div>
            )}
          </div>
          <Badge variant={row.assignmentStatus === "confirmed" ? "success" : "warning"}>
            {row.assignmentStatus}
          </Badge>
        </div>

        <dl className="space-y-1.5 text-xs">
          <div>
            <dt className="text-[10px] uppercase tracking-wide text-cos-muted">Contact</dt>
            <dd className="text-cos-text">{contactName ?? "No contact listed"}</dd>
          </div>
          {contactEmail && (
            <div className="flex items-center gap-1.5 text-cos-text">
              <Mail className="h-3 w-3 shrink-0 text-cos-muted" />
              <a href={`mailto:${contactEmail}`} className="truncate hover:underline">
                {contactEmail}
              </a>
            </div>
          )}
          {contactPhone && (
            <div className="flex items-center gap-1.5 text-cos-text">
              <Phone className="h-3 w-3 shrink-0 text-cos-muted" />
              <a href={`tel:${contactPhone}`} className="hover:underline">
                {contactPhone}
              </a>
            </div>
          )}
          {website && (
            <div className="flex items-center gap-1.5 text-cos-text">
              <ExternalLink className="h-3 w-3 shrink-0 text-cos-muted" />
              <a
                href={row.vendor.website?.startsWith("http") ? row.vendor.website : `https://${website}`}
                target="_blank"
                rel="noreferrer"
                className="truncate hover:underline"
              >
                {website}
              </a>
            </div>
          )}
          {address && (
            <div>
              <dt className="text-[10px] uppercase tracking-wide text-cos-muted">Address</dt>
              <dd className="leading-snug text-cos-text">{address}</dd>
            </div>
          )}
          {row.vendor.notesSummary && (
            <div>
              <dt className="text-[10px] uppercase tracking-wide text-cos-muted">Notes</dt>
              <dd className="line-clamp-2 text-cos-muted">{row.vendor.notesSummary}</dd>
            </div>
          )}
        </dl>

        {logoError && (
          <p className="text-xs text-red-600" role="alert">
            {logoError}
          </p>
        )}

        <div className="mt-auto flex items-center justify-between gap-2 border-t border-cos-border pt-2">
          <Link
            href={`/vendors/${row.vendor.id}`}
            className="text-xs font-medium text-cos-accent hover:underline"
          >
            View profile
          </Link>
          {canWrite && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-xs"
              disabled={pending || uploading}
              onClick={() => onRemove(row.assignmentId)}
            >
              Remove
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}

export function EventVendorsSection({
  eventId,
  data,
  categories,
  events,
  availableVendors,
  directoryHref,
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
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Store className="h-4 w-4 text-cos-muted" strokeWidth={1.5} />
            <h3 className="font-display text-lg text-cos-text">Vendors</h3>
          </div>
          <p className="mt-1 text-sm text-cos-muted">
            Vendor cards for this event — logo and details at a glance.
          </p>
        </div>
        {data.canWrite || directoryHref ? (
          <div className="flex flex-wrap gap-2">
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
                  onClick={() => setLinkOpen(true)}
                >
                  Add Existing
                </Button>
                <Button type="button" size="sm" onClick={() => setAddOpen(true)}>
                  <Plus className="mr-1.5 h-4 w-4" />
                  Create New
                </Button>
              </>
            ) : null}
          </div>
        ) : null}
      </div>

      {data.vendors.length === 0 ? (
        <Card className="p-5">
          <p className="text-sm text-cos-muted">
            No vendors linked yet. Add an existing vendor or create a new one.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(14rem,16rem))] gap-3">
          {data.vendors.map((row) => (
            <EventVendorCard
              key={row.assignmentId}
              row={row}
              eventId={eventId}
              canWrite={data.canWrite}
              pending={pending}
              onRemove={handleRemove}
              onLogoUploaded={() => router.refresh()}
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
        onCreated={() => router.refresh()}
      />
    </div>
  );
}
