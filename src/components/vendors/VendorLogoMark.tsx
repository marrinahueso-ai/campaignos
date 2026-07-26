"use client";

import Image from "next/image";
import { Camera, X } from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
  useTransition,
  type MouseEvent,
  type CSSProperties,
} from "react";
import {
  clearVendorLogoAction,
  uploadVendorLogoAction,
} from "@/lib/vendors/actions";
import {
  VENDOR_LOGO_MARK_HERO,
  VENDOR_LOGO_MARK_TONE,
  type VendorCardBandTone,
} from "@/lib/vendors/contact";
import { vendorInitials } from "@/lib/vendors/filters";
import { cn } from "@/lib/utils/cn";

export interface VendorLogoMarkProps {
  vendorId: string;
  vendorName: string;
  logoUrl: string | null;
  canWrite: boolean;
  /** Hero profile squircle vs directory/event card mark. */
  size: "hero" | "card";
  /** Colored card band — tints initials/upload shell on the band. */
  bandTone?: VendorCardBandTone | null;
  /** When set, logo mutations revalidate this event path. */
  eventId?: string | null;
  disabled?: boolean;
  onLogoChange?: () => void;
  className?: string;
}

export function VendorLogoMark({
  vendorId,
  vendorName,
  logoUrl,
  canWrite,
  size,
  bandTone = null,
  eventId = null,
  disabled = false,
  onLogoChange,
  className,
}: VendorLogoMarkProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewObjectUrlRef = useRef<string | null>(null);
  const [uploading, startUpload] = useTransition();
  const [clearing, startClear] = useTransition();
  const [displayLogoUrl, setDisplayLogoUrl] = useState(logoUrl);
  const [logoError, setLogoError] = useState<string | null>(null);
  const initials = vendorInitials(vendorName);
  const busy = uploading || clearing || disabled;
  const isHero = size === "hero";

  useEffect(() => {
    if (previewObjectUrlRef.current) {
      URL.revokeObjectURL(previewObjectUrlRef.current);
      previewObjectUrlRef.current = null;
    }
    setDisplayLogoUrl(logoUrl);
  }, [logoUrl]);

  useEffect(() => {
    return () => {
      if (previewObjectUrlRef.current) {
        URL.revokeObjectURL(previewObjectUrlRef.current);
        previewObjectUrlRef.current = null;
      }
    };
  }, []);

  function handleLogoChange(fileList: FileList | null) {
    const file = fileList?.[0];
    if (!file) return;

    setLogoError(null);
    if (previewObjectUrlRef.current) {
      URL.revokeObjectURL(previewObjectUrlRef.current);
      previewObjectUrlRef.current = null;
    }
    const previewUrl = URL.createObjectURL(file);
    previewObjectUrlRef.current = previewUrl;
    setDisplayLogoUrl(previewUrl);

    startUpload(async () => {
      const formData = new FormData();
      formData.set("vendorId", vendorId);
      if (eventId) {
        formData.set("eventId", eventId);
      }
      formData.set("file", file);
      const result = await uploadVendorLogoAction(formData);
      if (!result.success) {
        if (previewObjectUrlRef.current === previewUrl) {
          URL.revokeObjectURL(previewUrl);
          previewObjectUrlRef.current = null;
        }
        setDisplayLogoUrl(logoUrl);
        setLogoError(result.error ?? "Unable to upload logo.");
        return;
      }
      // Success: keep the blob preview until `logoUrl` refreshes from the
      // parent; the logoUrl effect revokes the object URL then.
      onLogoChange?.();
    });
  }

  function handleClearLogo(event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    if (!canWrite || !displayLogoUrl || busy) return;
    if (!confirm("Remove this vendor logo?")) return;

    setLogoError(null);
    const previous = displayLogoUrl;
    setDisplayLogoUrl(null);

    startClear(async () => {
      const result = await clearVendorLogoAction(vendorId, eventId);
      if (!result.success) {
        setDisplayLogoUrl(previous);
        setLogoError(result.error ?? "Unable to remove logo.");
        return;
      }
      onLogoChange?.();
    });
  }

  const toneStyle = bandTone ? VENDOR_LOGO_MARK_TONE[bandTone] : null;
  const initialsTextColor =
    toneStyle?.initialsText ??
    (isHero ? VENDOR_LOGO_MARK_HERO.initialsText : "#2a2622");

  const mark = (
    <>
      {displayLogoUrl ? (
        <Image
          src={displayLogoUrl}
          alt={`${vendorName} logo`}
          fill
          className="object-cover"
          sizes={isHero ? "72px" : "48px"}
          unoptimized
        />
      ) : (
        <span
          className={cn(
            "font-display font-semibold tracking-wide",
            isHero ? "text-[28px]" : "text-[13px]",
          )}
          style={{ color: initialsTextColor }}
        >
          {initials}
        </span>
      )}
    </>
  );

  const shellStyle: CSSProperties | undefined = (() => {
    if (displayLogoUrl) {
      if (bandTone && !isHero) {
        return { border: `1px solid ${toneStyle!.logoBorder}` };
      }
      return undefined;
    }
    if (toneStyle) {
      return { backgroundColor: toneStyle.initialsBg };
    }
    if (isHero) {
      return { backgroundColor: VENDOR_LOGO_MARK_HERO.initialsBg };
    }
    return undefined;
  })();

  const shellClass = cn(
    "relative grid place-items-center overflow-hidden",
    isHero
      ? "h-[72px] w-[72px] rounded-[20px] border-[3px] border-cos-card shadow-[0_8px_28px_rgba(28,36,48,0.06)]"
      : "h-12 w-12 rounded-[14px] shadow-[0_2px_10px_rgba(28,36,48,0.18)]",
    displayLogoUrl
      ? bandTone && !isHero
        ? "border bg-transparent"
        : "bg-[#fffcf7]"
      : toneStyle || isHero
        ? undefined
        : "bg-[#fffcf7]",
    className,
  );

  return (
    <div className="relative shrink-0">
      {canWrite ? (
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
          <button
            type="button"
            aria-label={
              displayLogoUrl
                ? `Change ${vendorName} logo`
                : `Upload ${vendorName} logo`
            }
            disabled={busy}
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              "group/logo transition disabled:opacity-50",
              shellClass,
            )}
            style={shellStyle}
          >
            {mark}
            <span className="absolute inset-0 grid place-items-center bg-[rgba(42,38,34,0.45)] text-[#fffcf7] opacity-0 transition group-hover/logo:opacity-100 group-focus-visible/logo:opacity-100">
              <Camera
                className={cn(isHero ? "h-5 w-5" : "h-4 w-4")}
                aria-hidden
              />
            </span>
          </button>
          {displayLogoUrl ? (
            <button
              type="button"
              aria-label={`Remove ${vendorName} logo`}
              disabled={busy}
              onClick={handleClearLogo}
              className={cn(
                "absolute z-10 grid place-items-center rounded-full border border-cos-border bg-cos-card text-cos-muted shadow-[0_2px_8px_rgba(28,36,48,0.12)] transition hover:text-cos-text disabled:opacity-50",
                isHero
                  ? "-top-1.5 -right-1.5 h-6 w-6"
                  : "-top-1.5 -right-1.5 h-5 w-5",
              )}
            >
              <X className={cn(isHero ? "h-3.5 w-3.5" : "h-3 w-3")} aria-hidden />
            </button>
          ) : null}
        </>
      ) : (
        <div className={shellClass} style={shellStyle}>
          {mark}
        </div>
      )}
      {logoError ? (
        <p
          className={cn(
            "m-0 text-xs text-red-600",
            isHero ? "mt-1.5" : "sr-only",
          )}
          role="alert"
        >
          {logoError}
        </p>
      ) : null}
    </div>
  );
}
