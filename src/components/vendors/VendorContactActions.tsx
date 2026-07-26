import { cn } from "@/lib/utils/cn";
import type { ResolvedVendorContact } from "@/lib/vendors/contact";

type ContactActionSize = "sm" | "md";

export function VendorContactActions({
  contact,
  size = "sm",
  className,
  showLabels = true,
}: {
  contact: Pick<
    ResolvedVendorContact,
    "phone" | "email" | "websiteHref" | "websiteLabel"
  >;
  size?: ContactActionSize;
  className?: string;
  /** When false, still render available actions with short labels. */
  showLabels?: boolean;
}) {
  const pad = size === "md" ? "px-3.5 py-2 text-[13px]" : "px-2.5 py-1.5 text-xs";
  const items: Array<{
    key: string;
    href: string;
    label: string;
    tone: "phone" | "mail" | "web";
    external?: boolean;
  }> = [];

  if (contact.phone) {
    items.push({
      key: "phone",
      href: `tel:${contact.phone}`,
      label: showLabels ? "Call" : contact.phone,
      tone: "phone",
    });
  }
  if (contact.email) {
    items.push({
      key: "mail",
      href: `mailto:${contact.email}`,
      label: showLabels ? "Email" : contact.email,
      tone: "mail",
    });
  }
  if (contact.websiteHref) {
    items.push({
      key: "web",
      href: contact.websiteHref,
      label: showLabels ? "Website" : (contact.websiteLabel ?? "Website"),
      tone: "web",
      external: true,
    });
  }

  if (items.length === 0) {
    return null;
  }

  return (
    <div
      className={cn("flex flex-wrap gap-1.5", className)}
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => event.stopPropagation()}
    >
      {items.map((item) => (
        <a
          key={item.key}
          href={item.href}
          {...(item.external
            ? { target: "_blank", rel: "noreferrer" }
            : {})}
          className={cn(
            "inline-flex items-center gap-1 rounded-full font-bold no-underline transition hover:brightness-[0.96]",
            pad,
            item.tone === "phone" &&
              "bg-[rgba(42,122,134,0.12)] text-[#2a7a86]",
            item.tone === "mail" &&
              "bg-[rgba(47,74,60,0.1)] text-[#2f4a3c]",
            item.tone === "web" &&
              "bg-[rgba(196,146,46,0.16)] text-[#7a5a12]",
          )}
        >
          {item.label}
        </a>
      ))}
    </div>
  );
}

export function VendorHeroContactActions({
  contact,
  className,
}: {
  contact: ResolvedVendorContact;
  className?: string;
}) {
  const items: Array<{
    key: string;
    href: string;
    label: string;
    className: string;
    external?: boolean;
  }> = [];

  if (contact.phone) {
    items.push({
      key: "tel",
      href: `tel:${contact.phone}`,
      label: contact.callLabel,
      className:
        "bg-[rgba(42,122,134,0.12)] text-[#2a7a86] border-transparent",
    });
  }
  if (contact.email) {
    items.push({
      key: "mail",
      href: `mailto:${contact.email}`,
      label: contact.email,
      className:
        "bg-[rgba(47,74,60,0.12)] text-[#2f4a3c] border-transparent",
    });
  }
  if (contact.websiteHref) {
    items.push({
      key: "web",
      href: contact.websiteHref,
      label: contact.websiteLabel ?? "Website",
      className:
        "bg-cos-card text-cos-text border-cos-border shadow-[0_8px_28px_rgba(28,36,48,0.06)]",
      external: true,
    });
  }

  if (items.length === 0) {
    return (
      <p className="mb-4 text-sm text-cos-muted">
        No phone, email, or website on file yet.
      </p>
    );
  }

  // First available action gets the ink primary treatment (mockup: Call).
  const [primary, ...rest] = items;

  return (
    <div className={cn("mb-4 flex flex-wrap gap-2", className)}>
      <a
        href={primary!.href}
        {...(primary!.external
          ? { target: "_blank", rel: "noreferrer" }
          : {})}
        className="inline-flex items-center gap-2 rounded-full border-[1.5px] border-cos-text bg-cos-text px-4 py-[11px] text-sm font-bold text-cos-card no-underline shadow-[0_8px_28px_rgba(28,36,48,0.06)] transition hover:-translate-y-px"
      >
        {primary!.label}
      </a>
      {rest.map((item) => (
        <a
          key={item.key}
          href={item.href}
          {...(item.external
            ? { target: "_blank", rel: "noreferrer" }
            : {})}
          className={cn(
            "inline-flex items-center gap-2 rounded-full border-[1.5px] px-4 py-[11px] text-sm font-bold no-underline transition hover:-translate-y-px",
            item.className,
          )}
        >
          {item.label}
        </a>
      ))}
    </div>
  );
}
