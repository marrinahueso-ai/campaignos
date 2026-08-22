"use client";

import { Download, Printer } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";

import {
  downloadFlyerExport,
  printFlyerExport,
} from "@/lib/flyer-composer/flyer-export-client";
import { composePrinterFriendlyBwPngBlob } from "@/lib/flyer-composer/printer-friendly-bw";
import type { FlyerPrintSize } from "@/lib/flyers/types";
import { cn } from "@/lib/utils/cn";

export type FlyerExportAppearance = "color" | "bw";

const HELPER_COPY = "Printer-friendly version • No AI credits used";

export function useFlyerExportAppearance(colorImageUrl: string | null) {
  const [appearance, setAppearance] = useState<FlyerExportAppearance>("color");
  const [bwObjectUrl, setBwObjectUrl] = useState<string | null>(null);
  const [converting, setConverting] = useState(false);
  const cacheRef = useRef<{ source: string; url: string } | null>(null);

  useEffect(() => {
    if (!colorImageUrl) {
      setBwObjectUrl(null);
      return;
    }
    const cached = cacheRef.current;
    if (cached && cached.source !== colorImageUrl) {
      URL.revokeObjectURL(cached.url);
      cacheRef.current = null;
      setBwObjectUrl(null);
    }
  }, [colorImageUrl]);

  useEffect(() => {
    if (appearance !== "bw" || !colorImageUrl) {
      setConverting(false);
      return;
    }
    const cached = cacheRef.current;
    if (cached?.source === colorImageUrl) {
      setBwObjectUrl(cached.url);
      setConverting(false);
      return;
    }

    let cancelled = false;
    setConverting(true);
    void composePrinterFriendlyBwPngBlob(colorImageUrl)
      .then((blob) => {
        if (cancelled) return;
        const url = URL.createObjectURL(blob);
        const prev = cacheRef.current;
        if (prev) URL.revokeObjectURL(prev.url);
        cacheRef.current = { source: colorImageUrl, url };
        setBwObjectUrl(url);
      })
      .catch(() => {
        if (!cancelled) setBwObjectUrl(null);
      })
      .finally(() => {
        if (!cancelled) setConverting(false);
      });

    return () => {
      cancelled = true;
    };
  }, [appearance, colorImageUrl]);

  useEffect(() => {
    return () => {
      const cached = cacheRef.current;
      if (cached) URL.revokeObjectURL(cached.url);
    };
  }, []);

  const displayImageUrl =
    appearance === "bw" && bwObjectUrl ? bwObjectUrl : colorImageUrl;

  return {
    appearance,
    setAppearance,
    converting,
    displayImageUrl,
    exportReady: appearance === "color" || Boolean(bwObjectUrl),
    helperCopy: appearance === "bw" ? HELPER_COPY : null,
  };
}

type Props = {
  colorImageUrl: string | null;
  filenameBase: string;
  printSize: FlyerPrintSize;
  disabled?: boolean;
  onError?: (message: string) => void;
  children?: ReactNode;
} & ReturnType<typeof useFlyerExportAppearance>;

export function FlyerExportActions({
  colorImageUrl,
  filenameBase,
  printSize,
  disabled,
  onError,
  children,
  appearance,
  setAppearance,
  converting,
  displayImageUrl,
  exportReady,
  helperCopy,
}: Props) {
  const isHalf = printSize === "half";
  const canAct = Boolean(displayImageUrl) && exportReady && !disabled && !converting;

  return (
    <div className="space-y-3">
      <label className="text-[10px] font-bold tracking-widest text-cos-muted uppercase">
        Export & Actions
      </label>
      <div
        role="radiogroup"
        aria-label="Print and download appearance"
        className="grid grid-cols-2 gap-2"
      >
        {(
          [
            { id: "color" as const, label: "Full Color" },
            { id: "bw" as const, label: "Printer-Friendly B&W" },
          ] as const
        ).map((option) => {
          const active = appearance === option.id;
          return (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={active}
              disabled={!colorImageUrl || disabled}
              onClick={() => setAppearance(option.id)}
              className={cn(
                "rounded-xl border bg-white px-2 py-2.5 text-center text-[11px] font-bold leading-snug transition disabled:opacity-50",
                active
                  ? "border-2 border-[#0d7e5e] text-[#0d7e5e]"
                  : "border-cos-border text-cos-ink hover:border-[#0d7e5e]",
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>
      {appearance === "bw" ? (
        <p className="text-[11px] leading-snug text-cos-muted">{HELPER_COPY}</p>
      ) : null}
      {converting ? (
        <p className="text-[11px] font-medium text-[#0d7e5e]">
          Preparing printer-friendly preview…
        </p>
      ) : null}
      {appearance === "bw" && !converting && !exportReady ? (
        <p className="text-[11px] text-amber-700">
          Couldn’t prepare B&W from this image. Stay on Full Color or try again.
        </p>
      ) : null}
      <button
        type="button"
        disabled={!canAct}
        onClick={() => {
          if (!displayImageUrl) return;
          void downloadFlyerExport({
            imageUrl: displayImageUrl,
            filenameBase:
              appearance === "bw"
                ? `${filenameBase}-printer-friendly`
                : filenameBase,
            printSize,
          }).catch(() => {
            onError?.("Could not download flyer.");
          });
        }}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-cos-border bg-white py-3 text-xs font-bold transition hover:bg-cos-bg disabled:opacity-50"
      >
        <Download className="h-3.5 w-3.5" />{" "}
        {isHalf ? "Download PNG (2 per page)" : "Download PNG"}
      </button>
      <button
        type="button"
        disabled={!canAct}
        onClick={() =>
          displayImageUrl && printFlyerExport(displayImageUrl, printSize)
        }
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-cos-border bg-white py-3 text-xs font-bold transition hover:bg-cos-bg disabled:opacity-50"
      >
        <Printer className="h-3.5 w-3.5" />{" "}
        {isHalf ? "Print (2 per page)" : "Print"}
      </button>
      {children}
      {helperCopy ? <span className="sr-only">{helperCopy}</span> : null}
    </div>
  );
}
