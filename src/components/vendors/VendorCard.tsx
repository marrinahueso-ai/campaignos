"use client";

import Image from "next/image";
import Link from "next/link";
import { Camera, ExternalLink, Mail, Phone, Star } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { CategoryPill } from "@/components/vendors/VendorDetailDrawer";
import {
  toggleVendorFavoriteAction,
  uploadVendorLogoAction,
} from "@/lib/vendors/actions";
import { formatVendorWebsite, vendorInitials } from "@/lib/vendors/filters";
import type { Vendor, VendorCategory, VendorContact } from "@/types/vendors";
import { cn } from "@/lib/utils/cn";

export function formatVendorCardAddress(vendor: Pick<
  Vendor,
  "addressLine1" | "city" | "state" | "postalCode"
>): string | null {
  const line = [vendor.addressLine1, vendor.city, vendor.state, vendor.postalCode]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(", ");
  return line || null;
}

export interface VendorCardProps {
  vendor: Vendor;
  category: VendorCategory | null;
  primaryContact: VendorContact | null;
  logoUrl: string | null;
  statusLabel: string;
  statusVariant?: "success" | "warning" | "default";
  canWrite: boolean;
  /** Disables footer Remove / logo while a parent mutation is in flight. */
  pending?: boolean;
  /** When set, logo upload revalidates this event path. */
  eventId?: string | null;
  /** Event-assignment unlink. Omit on directory cards. */
  onRemove?: () => void;
  onLogoUploaded?: () => void;
  /** Card-body click (ignores links/buttons) — e.g. open directory drawer. */
  onSelect?: () => void;
  /** After favorite toggle succeeds (pass next value for local list patches). */
  onFavoriteChange?: (isFavorite: boolean) => void;
  className?: string;
}

export function VendorCard({
  vendor,
  category,
  primaryContact,
  logoUrl,
  statusLabel,
  statusVariant = "warning",
  canWrite,
  pending = false,
  eventId = null,
  onRemove,
  onLogoUploaded,
  onSelect,
  onFavoriteChange,
  className,
}: VendorCardProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [logoError, setLogoError] = useState<string | null>(null);
  const [uploading, startUpload] = useTransition();
  const [favoriting, startFavorite] = useTransition();
  const [optimisticFavorite, setOptimisticFavorite] = useState(vendor.isFavorite);
  const contactName = primaryContact?.name ?? null;
  const contactEmail = primaryContact?.email ?? vendor.email;
  const contactPhone = primaryContact?.phone ?? vendor.phone;
  const website = formatVendorWebsite(vendor.website);
  const address = formatVendorCardAddress(vendor);

  useEffect(() => {
    setOptimisticFavorite(vendor.isFavorite);
  }, [vendor.isFavorite]);

  function toggleFavorite() {
    if (!canWrite) return;
    const next = !optimisticFavorite;
    setOptimisticFavorite(next);
    startFavorite(async () => {
      const result = await toggleVendorFavoriteAction(vendor.id, next);
      if (!result.success) {
        setOptimisticFavorite(!next);
        return;
      }
      onFavoriteChange?.(next);
    });
  }

  function handleLogoChange(fileList: FileList | null) {
    const file = fileList?.[0];
    if (!file) {
      return;
    }

    setLogoError(null);
    startUpload(async () => {
      const formData = new FormData();
      formData.set("vendorId", vendor.id);
      if (eventId) {
        formData.set("eventId", eventId);
      }
      formData.set("file", file);
      const result = await uploadVendorLogoAction(formData);
      if (!result.success) {
        setLogoError(result.error ?? "Unable to upload logo.");
        return;
      }
      onLogoUploaded?.();
    });
  }

  return (
    <Card
      padding="none"
      className={cn(
        "flex h-full flex-col overflow-hidden border border-cos-border",
        onSelect && "cursor-pointer",
        className,
      )}
      onClick={
        onSelect
          ? (event) => {
              const target = event.target as HTMLElement;
              if (target.closest("a, button, input, label")) return;
              onSelect();
            }
          : undefined
      }
    >
      <div className="relative flex h-24 items-center justify-center bg-cos-bg">
        {logoUrl ? (
          <Image
            src={logoUrl}
            alt={`${vendor.name} logo`}
            fill
            className="object-contain p-2.5"
            sizes="220px"
            unoptimized
          />
        ) : (
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-cos-accent-soft text-sm font-semibold text-cos-dark">
            {vendorInitials(vendor.name)}
          </span>
        )}
        <button
          type="button"
          aria-label={
            optimisticFavorite ? "Remove from favorites" : "Add to favorites"
          }
          aria-pressed={optimisticFavorite}
          disabled={!canWrite || favoriting || pending}
          onClick={toggleFavorite}
          className={cn(
            "absolute top-2 right-2 z-10 inline-flex h-8 w-8 items-center justify-center rounded-full border border-cos-border/80 bg-cos-card/95 text-cos-muted shadow-sm transition-colors hover:text-cos-accent disabled:opacity-50",
            optimisticFavorite && "text-cos-accent",
          )}
        >
          <Star
            className={cn(
              "h-4 w-4",
              optimisticFavorite && "fill-cos-accent text-cos-accent",
            )}
          />
        </button>
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
              {uploading ? "Uploading…" : logoUrl ? "Change logo" : "Add logo"}
            </Button>
          </>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <Link
              href={`/vendors/${vendor.id}`}
              className="font-display text-base leading-snug text-cos-text hover:underline"
            >
              {vendor.name}
            </Link>
            {category && (
              <div className="mt-1">
                <CategoryPill category={category} />
              </div>
            )}
          </div>
          {statusLabel ? (
            <Badge variant={statusVariant}>{statusLabel}</Badge>
          ) : null}
        </div>

        <dl className="space-y-1.5 text-xs">
          <div>
            <dt className="text-[10px] uppercase tracking-wide text-cos-muted">
              Contact
            </dt>
            <dd className="text-cos-text">
              {contactName ?? "No contact listed"}
            </dd>
          </div>
          {contactEmail && (
            <div className="flex items-center gap-1.5 text-cos-text">
              <Mail className="h-3 w-3 shrink-0 text-cos-muted" />
              <a
                href={`mailto:${contactEmail}`}
                className="truncate hover:underline"
              >
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
                href={
                  vendor.website?.startsWith("http")
                    ? vendor.website
                    : `https://${website}`
                }
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
              <dt className="text-[10px] uppercase tracking-wide text-cos-muted">
                Address
              </dt>
              <dd className="leading-snug text-cos-text">{address}</dd>
            </div>
          )}
          {vendor.notesSummary && (
            <div>
              <dt className="text-[10px] uppercase tracking-wide text-cos-muted">
                Notes
              </dt>
              <dd className="line-clamp-2 text-cos-muted">
                {vendor.notesSummary}
              </dd>
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
            href={`/vendors/${vendor.id}`}
            className="text-xs font-medium text-cos-accent hover:underline"
          >
            View profile
          </Link>
          {canWrite && onRemove ? (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-xs"
              disabled={pending || uploading}
              onClick={onRemove}
            >
              Remove
            </Button>
          ) : null}
        </div>
      </div>
    </Card>
  );
}
