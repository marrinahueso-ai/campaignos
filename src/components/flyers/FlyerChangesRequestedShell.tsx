"use client";

import Link from "next/link";
import { ArrowRight, MessageSquare } from "lucide-react";

import { printSizeLabel } from "@/lib/flyers/generate-payload";
import { flyerComposerEditHref } from "@/lib/flyer-composer/approval";
import type { Flyer } from "@/lib/flyers/types";
import { cn } from "@/lib/utils/cn";

export type FlyerChangesEventInfo = {
  id: string;
  title: string;
  date: string | null;
};

type Props = {
  flyer: Flyer;
  event: FlyerChangesEventInfo | null;
  reviewedLabel?: string | null;
};

function formatShortDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

export function FlyerChangesRequestedShell({
  flyer,
  event,
  reviewedLabel,
}: Props) {
  const editHref = flyerComposerEditHref({ flyerId: flyer.id });

  return (
    <div className="studio-page pb-16">
      <div className="mb-10 flex items-center justify-between gap-4">
        <div>
          <p className="mb-2 text-xs font-bold tracking-[0.2em] text-cos-muted uppercase">
            Flyer
          </p>
          <h1 className="font-display text-3xl font-semibold tracking-[-0.02em] text-cos-text sm:text-4xl">
            {flyer.title?.trim() || "Untitled flyer"}
          </h1>
        </div>
        <Link
          href="/flyers"
          className="text-sm font-medium text-cos-muted transition hover:text-cos-text"
        >
          ← Library
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-16">
        <div className="lg:col-span-5">
          <div className="sticky top-8">
            <div
              className={cn(
                "relative w-full overflow-hidden rounded-xl border border-cos-border bg-white",
                flyer.printSize === "half"
                  ? "aspect-[8.5/5.5]"
                  : "aspect-[8.5/11]",
              )}
            >
              {flyer.previewImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={flyer.previewImageUrl}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-cos-muted">
                  No preview
                </div>
              )}
            </div>
            {flyer.previewImageUrl ? (
              <div className="mt-6 flex justify-center">
                <a
                  href={flyer.previewImageUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 text-xs font-bold tracking-widest text-cos-muted uppercase transition hover:text-[#0d7e5e]"
                >
                  View Full Preview
                </a>
              </div>
            ) : null}
          </div>
        </div>

        <div className="space-y-12 lg:col-span-7">
          <div className="rounded-3xl border border-amber-100 bg-amber-50 p-8">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-600">
                <MessageSquare className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-amber-900">
                  Changes Requested
                </h2>
                <p className="text-sm text-amber-700">
                  Submitted {formatShortDate(flyer.submittedAt)}
                  {reviewedLabel ? ` · ${reviewedLabel}` : ""}
                </p>
              </div>
            </div>
            <div className="rounded-2xl border border-amber-100 bg-white p-6 shadow-sm">
              <p className="text-sm leading-relaxed font-medium text-amber-900 italic">
                {flyer.changeRequestNote?.trim()
                  ? `“${flyer.changeRequestNote.trim()}”`
                  : "Your reviewer asked for updates. Open the builder to revise and resubmit."}
              </p>
            </div>
          </div>

          <div>
            <h3 className="mb-6 text-[10px] font-bold tracking-[0.2em] text-cos-muted uppercase">
              Flyer Details
            </h3>
            <div className="grid grid-cols-2 gap-8">
              <div>
                <p className="mb-1 text-xs text-cos-muted">Name</p>
                <p className="font-medium">
                  {flyer.title?.trim() || "Untitled flyer"}
                </p>
              </div>
              <div>
                <p className="mb-1 text-xs text-cos-muted">Event</p>
                <p className="font-medium">{event?.title || "No event"}</p>
              </div>
              <div>
                <p className="mb-1 text-xs text-cos-muted">Last Edited</p>
                <p className="font-medium">{formatShortDate(flyer.updatedAt)}</p>
              </div>
              <div>
                <p className="mb-1 text-xs text-cos-muted">Size</p>
                <p className="font-medium">{printSizeLabel(flyer.printSize)}</p>
              </div>
            </div>
          </div>

          <div className="pt-4">
            <Link
              href={editHref}
              className="flex w-full items-center justify-center gap-3 rounded-2xl bg-cos-text py-4 font-bold text-white shadow-lg transition hover:bg-black"
            >
              Edit Flyer <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
