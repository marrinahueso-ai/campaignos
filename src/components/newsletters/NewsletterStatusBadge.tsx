import { Badge } from "@/components/ui/Badge";
import type { NewsletterStatus } from "@/lib/newsletter/types";

const STATUS_CONFIG: Record<
  NewsletterStatus,
  { label: string; variant: "default" | "success" | "warning" | "info"; className?: string }
> = {
  draft: {
    label: "Draft",
    variant: "warning",
    className: "bg-cos-brand-mustard-soft text-cos-brand-navy",
  },
  needs_approval: {
    label: "Needs approval",
    variant: "info",
    className: "bg-cos-brand-navy-soft text-cos-brand-navy",
  },
  changes_requested: {
    label: "Changes requested",
    variant: "warning",
    className: "bg-cos-brand-terracotta-soft text-cos-brand-terracotta",
  },
  approved: {
    label: "Approved",
    variant: "success",
    className: "bg-cos-brand-sage-soft text-cos-brand-sage",
  },
  scheduled: {
    label: "Scheduled",
    variant: "info",
    className: "bg-cos-brand-navy-soft text-cos-brand-navy",
  },
  sending: {
    label: "Sending",
    variant: "info",
    className: "bg-cos-brand-navy-soft text-cos-brand-navy",
  },
  sent: {
    label: "Sent",
    variant: "success",
    className: "bg-cos-brand-sage-soft text-cos-brand-sage",
  },
  failed: {
    label: "Failed",
    variant: "warning",
    className: "bg-cos-error/15 text-cos-error",
  },
};

export function NewsletterStatusBadge({ status }: { status: NewsletterStatus }) {
  const config = STATUS_CONFIG[status];
  return (
    <Badge variant={config.variant} className={config.className}>
      {config.label}
    </Badge>
  );
}
