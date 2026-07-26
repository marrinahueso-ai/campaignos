"use client";

import Link from "next/link";
import {
  EaseBtnSecondary,
  EaseSoftActions,
} from "@/components/events-phase3/EventDetailEaseUi";
import { VendorContactActions } from "@/components/vendors/VendorContactActions";
import { resolveVendorContact } from "@/lib/vendors/contact";
import { cn } from "@/lib/utils/cn";
import type { EventVendorsData } from "@/types/vendors";

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
  data,
  directoryHref,
}: {
  data: EventVendorsData;
  directoryHref: string;
}) {
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
                <div className="flex flex-row items-center gap-2 sm:flex-col sm:items-end">
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-0.5 text-[11px] font-extrabold tracking-[0.04em] uppercase",
                      status.toneClass,
                    )}
                  >
                    {status.pill}
                  </span>
                  <Link
                    href={`/vendors/${row.vendor.id}`}
                    className="inline-flex items-center justify-center rounded-full border-[1.5px] border-cos-border bg-cos-card px-4 py-2 text-[13px] font-bold text-cos-text no-underline transition hover:-translate-y-px"
                  >
                    Profile
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <EaseSoftActions>
        <EaseBtnSecondary href={directoryHref}>Link vendor</EaseBtnSecondary>
        <a
          href={directoryHref}
          className="inline-flex items-center gap-1.5 rounded-full border-[1.5px] border-transparent px-3 py-2 text-[13px] font-bold text-cos-muted transition hover:text-cos-text"
        >
          Browse directory
        </a>
      </EaseSoftActions>
    </section>
  );
}
