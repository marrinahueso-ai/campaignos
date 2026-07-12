"use client";

import Link from "next/link";
import {
  Globe,
  Mail,
  MapPin,
  Phone,
  Star,
} from "lucide-react";
import { useTransition } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { VendorDrawer } from "@/components/vendors/VendorDrawer";
import {
  formatVendorWebsite,
  vendorInitials,
} from "@/lib/vendors/filters";
import { toggleVendorFavoriteAction } from "@/lib/vendors/actions";
import type {
  VendorCategory,
  VendorContact,
  VendorDirectoryRow,
  VendorEventSummary,
} from "@/types/vendors";
import { cn } from "@/lib/utils/cn";

function assignmentBadgeVariant(
  status: VendorEventSummary["assignmentStatus"],
): "success" | "warning" | "default" {
  switch (status) {
    case "confirmed":
    case "completed":
      return "success";
    case "pending":
      return "warning";
    default:
      return "default";
  }
}

function assignmentLabel(status: VendorEventSummary["assignmentStatus"]): string {
  switch (status) {
    case "confirmed":
      return "Confirmed";
    case "completed":
      return "Completed";
    case "pending":
      return "Pending";
    case "cancelled":
      return "Cancelled";
  }
}

interface VendorDetailDrawerProps {
  row: VendorDirectoryRow | null;
  open: boolean;
  onClose: () => void;
  onEdit: () => void;
  canWrite: boolean;
  notes?: string | null;
  assignments?: VendorEventSummary[];
}

export function VendorDetailDrawer({
  row,
  open,
  onClose,
  onEdit,
  canWrite,
  notes,
  assignments = [],
}: VendorDetailDrawerProps) {
  const [pending, startTransition] = useTransition();

  if (!row) {
    return null;
  }

  const { vendor, category, primaryContact, latestAssignment } = row;
  const displayAssignments =
    assignments.length > 0
      ? assignments
      : latestAssignment
        ? [latestAssignment]
        : [];

  function toggleFavorite() {
    startTransition(async () => {
      await toggleVendorFavoriteAction(vendor.id, !vendor.isFavorite);
    });
  }

  const website = formatVendorWebsite(vendor.website);
  const address = [
    vendor.addressLine1,
    [vendor.city, vendor.state, vendor.postalCode].filter(Boolean).join(", "),
  ]
    .filter(Boolean)
    .join("\n");

  return (
    <VendorDrawer open={open} onClose={onClose}>
      <div className="flex h-full flex-col overflow-y-auto px-6 pb-8 pt-14">
        <div className="flex items-start gap-4">
          <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-cos-accent-soft text-lg font-semibold text-cos-dark">
            {vendorInitials(vendor.name)}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <h2 className="font-display text-2xl text-cos-text">{vendor.name}</h2>
              <button
                type="button"
                aria-label={vendor.isFavorite ? "Remove favorite" : "Add favorite"}
                onClick={toggleFavorite}
                disabled={!canWrite || pending}
                className="shrink-0 text-cos-muted transition-colors hover:text-cos-accent disabled:opacity-50"
              >
                <Star
                  className={cn(
                    "h-5 w-5",
                    vendor.isFavorite && "fill-cos-accent text-cos-accent",
                  )}
                />
              </button>
            </div>
            {latestAssignment && (
              <Badge variant={assignmentBadgeVariant(latestAssignment.assignmentStatus)}>
                {assignmentLabel(latestAssignment.assignmentStatus)}
              </Badge>
            )}
          </div>
        </div>

        <div className="mt-6 flex gap-2">
          <Button type="button" size="sm" onClick={onEdit} disabled={!canWrite}>
            Edit Vendor
          </Button>
          <Button type="button" size="sm" variant="secondary" href={`/vendors/${vendor.id}`}>
            View Profile
          </Button>
        </div>

        <section className="mt-8 space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-cos-muted">
            Contact Information
          </h3>
          <ContactLine
            contact={primaryContact}
            vendorEmail={vendor.email}
            vendorPhone={vendor.phone}
          />
          {website && (
            <InfoRow icon={Globe} label={website} href={`https://${website}`} />
          )}
          {address && <InfoRow icon={MapPin} label={address} />}
        </section>

        {category && (
          <section className="mt-6">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-cos-muted">
              Category
            </h3>
            <CategoryPill category={category} />
          </section>
        )}

        {displayAssignments.length > 0 && (
          <section className="mt-6 space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-cos-muted">
              Events
            </h3>
            <ul className="space-y-2">
              {displayAssignments.slice(0, 4).map((assignment) => (
                <li
                  key={assignment.assignmentId}
                  className="flex items-center justify-between gap-3 border border-cos-border px-3 py-2"
                >
                  <div className="min-w-0">
                    <Link
                      href={`/events/${assignment.eventId}`}
                      className="truncate text-sm font-medium text-cos-text hover:underline"
                    >
                      {assignment.eventTitle}
                    </Link>
                    <p className="text-xs text-cos-muted">{assignment.eventDate}</p>
                  </div>
                  <Badge variant={assignmentBadgeVariant(assignment.assignmentStatus)}>
                    {assignmentLabel(assignment.assignmentStatus)}
                  </Badge>
                </li>
              ))}
            </ul>
            {displayAssignments.length > 4 && (
              <Link
                href={`/vendors/${vendor.id}`}
                className="text-sm text-cos-dark underline-offset-2 hover:underline"
              >
                View all events →
              </Link>
            )}
          </section>
        )}

        {(notes || vendor.notesSummary) && (
          <section className="mt-6 space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-cos-muted">
              Notes
            </h3>
            <p className="text-sm leading-relaxed text-cos-text">
              {notes ?? vendor.notesSummary}
            </p>
          </section>
        )}
      </div>
    </VendorDrawer>
  );
}

function ContactLine({
  contact,
  vendorEmail,
  vendorPhone,
}: {
  contact: VendorContact | null;
  vendorEmail: string | null;
  vendorPhone: string | null;
}) {
  const name = contact?.name ?? "—";
  const title = contact?.title;
  const email = contact?.email ?? vendorEmail;
  const phone = contact?.phone ?? vendorPhone;

  return (
    <div className="space-y-2 text-sm text-cos-text">
      <p>
        <span className="font-medium">{name}</span>
        {title ? <span className="text-cos-muted">, {title}</span> : null}
      </p>
      {phone && <InfoRow icon={Phone} label={phone} href={`tel:${phone}`} />}
      {email && <InfoRow icon={Mail} label={email} href={`mailto:${email}`} />}
    </div>
  );
}

function InfoRow({
  icon: Icon,
  label,
  href,
}: {
  icon: typeof Phone;
  label: string;
  href?: string;
}) {
  const content = (
    <span className="flex items-start gap-2 text-sm text-cos-text">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-cos-muted" strokeWidth={1.5} />
      <span className="whitespace-pre-line">{label}</span>
    </span>
  );

  if (href) {
    return (
      <a href={href} className="hover:underline">
        {content}
      </a>
    );
  }

  return content;
}

export function CategoryPill({ category }: { category: VendorCategory }) {
  return (
    <span
      className="inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium text-cos-text"
      style={{ backgroundColor: `${category.color}33` }}
    >
      {category.name}
    </span>
  );
}
