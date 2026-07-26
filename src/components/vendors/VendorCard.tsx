"use client";

import Link from "next/link";
import { Star } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { VendorContactActions } from "@/components/vendors/VendorContactActions";
import { VendorLogoMark } from "@/components/vendors/VendorLogoMark";
import { toggleVendorFavoriteAction } from "@/lib/vendors/actions";
import {
  resolveVendorContact,
  vendorCardBandTone,
  vendorStatusPill,
} from "@/lib/vendors/contact";
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

/** Layered band fills — use `background` (not `bg-[…]`). Tailwind v4 maps
 * multi-layer `bg-[gradient,…,#hex]` to invalid `background-color`. */
const BAND_STYLE = {
  forest: {
    background:
      "linear-gradient(135deg, rgba(47,74,60,0.85), rgba(107,129,113,0.55)), #2f4a3c",
  },
  mustard: {
    background:
      "linear-gradient(135deg, rgba(196,146,46,0.9), rgba(232,200,120,0.5)), #c4922e",
  },
  teal: {
    background:
      "linear-gradient(135deg, rgba(42,122,134,0.9), rgba(120,180,188,0.45)), #2a7a86",
  },
} as const satisfies Record<
  "forest" | "mustard" | "teal",
  { background: string }
>;

export interface VendorCardProps {
  vendor: Vendor;
  category: VendorCategory | null;
  primaryContact: VendorContact | null;
  logoUrl: string | null;
  /** @deprecated Ease cards use vendor.status; kept for call-site compat. */
  statusLabel?: string;
  /** @deprecated Ease cards use vendor.status; kept for call-site compat. */
  statusVariant?: "success" | "warning" | "default";
  canWrite: boolean;
  /** Disables footer Remove / favorite while a parent mutation is in flight. */
  pending?: boolean;
  /** When set, logo upload revalidates this event path. */
  eventId?: string | null;
  /** Event-assignment unlink. Omit on directory cards. */
  onRemove?: () => void;
  onLogoUploaded?: () => void;
  /** Card-body click (ignores links/buttons) — e.g. navigate to profile. */
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
  canWrite,
  pending = false,
  eventId = null,
  onRemove,
  onSelect,
  onLogoUploaded,
  onFavoriteChange,
  className,
}: VendorCardProps) {
  const [favoriting, startFavorite] = useTransition();
  const [optimisticFavorite, setOptimisticFavorite] = useState(vendor.isFavorite);
  const contact = resolveVendorContact(vendor, primaryContact);
  const status = vendorStatusPill(vendor.status);
  const bandTone = vendorCardBandTone(vendor.id, category?.color);
  const profileHref = `/vendors/${vendor.id}`;

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

  return (
    <article
      className={cn(
        "group flex h-full cursor-pointer flex-col overflow-hidden rounded-[22px] border border-cos-border bg-cos-card text-left shadow-[0_8px_28px_rgba(28,36,48,0.06)] transition hover:-translate-y-0.5 hover:shadow-[0_20px_48px_rgba(42,38,34,0.12)]",
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
      <div
        className="relative flex h-[72px] items-center px-3.5"
        style={BAND_STYLE[bandTone]}
      >
        <VendorLogoMark
          vendorId={vendor.id}
          vendorName={vendor.name}
          logoUrl={logoUrl}
          canWrite={canWrite}
          size="card"
          bandTone={bandTone}
          eventId={eventId}
          disabled={pending}
          onLogoChange={onLogoUploaded}
        />

        <button
          type="button"
          aria-label={
            optimisticFavorite ? "Remove from favorites" : "Add to favorites"
          }
          aria-pressed={optimisticFavorite}
          disabled={!canWrite || favoriting || pending}
          onClick={toggleFavorite}
          className={cn(
            "absolute top-2.5 right-2.5 z-10 grid h-[30px] w-[30px] place-items-center rounded-full border-none bg-[rgba(255,252,247,0.92)] text-[#c4922e] shadow-[0_2px_8px_rgba(28,36,48,0.08)] transition disabled:opacity-50",
            !optimisticFavorite && "text-cos-muted",
          )}
        >
          <Star
            className={cn(
              "h-3.5 w-3.5",
              optimisticFavorite && "fill-current",
            )}
          />
        </button>
      </div>

      <div className="flex flex-1 flex-col gap-2 px-3.5 pt-3.5 pb-3">
        <h3 className="m-0 font-display text-lg font-semibold tracking-[-0.01em] text-cos-text">
          <Link
            href={profileHref}
            className="text-inherit no-underline hover:underline"
          >
            {vendor.name}
          </Link>
        </h3>

        <div className="flex flex-wrap gap-1.5">
          {category ? (
            <span className="rounded-full bg-[rgba(47,74,60,0.12)] px-2.5 py-0.5 text-[11px] font-extrabold tracking-[0.04em] text-[#2f4a3c] uppercase">
              {category.name}
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

        <div className="mt-0.5 flex flex-col gap-1.5">
          <div className="text-[13px] font-bold text-cos-muted">
            {contact.whoLabel ?? "No contact listed"}
          </div>
          <VendorContactActions contact={contact} />
        </div>

        <div className="mt-auto border-t border-cos-border pt-2.5">
          <div className="flex items-center gap-2">
            <Link
              href={profileHref}
              className="inline-flex w-full items-center justify-center rounded-full border-[1.5px] border-cos-border bg-cos-card px-[18px] py-2.5 text-[13px] font-bold text-cos-text no-underline transition hover:-translate-y-px"
            >
              View profile
            </Link>
            {canWrite && onRemove ? (
              <button
                type="button"
                disabled={pending}
                onClick={onRemove}
                className="shrink-0 rounded-full px-3 py-2 text-xs font-bold text-cos-muted transition hover:text-cos-text disabled:opacity-50"
              >
                Remove
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  );
}
