import Link from "next/link";
import { cn } from "@/lib/utils/cn";

export type BillingPlanTab =
  | "overview"
  | "plan"
  | "usage"
  | "payment"
  | "history";

const TABS: { id: BillingPlanTab; label: string; href: string }[] = [
  { id: "overview", label: "Overview", href: "/settings/billing-plan" },
  { id: "plan", label: "Plan & Pricing", href: "/settings/billing-plan?tab=plan" },
  { id: "usage", label: "Usage", href: "/settings/billing-plan?tab=usage" },
  { id: "payment", label: "Payment Method", href: "/settings/billing-plan?tab=payment" },
  { id: "history", label: "Billing History", href: "/settings/billing-plan?tab=history" },
];

export function billingPlanTabFromParam(value: string | undefined): BillingPlanTab {
  if (
    value === "plan" ||
    value === "usage" ||
    value === "payment" ||
    value === "history"
  ) {
    return value;
  }
  return "overview";
}

export function BillingPlanTabs({ active }: { active: BillingPlanTab }) {
  return (
    <div className="flex gap-6 border-b border-cos-border" role="tablist" aria-label="Billing & Plan">
      {TABS.map((tab) => (
        <Link
          key={tab.id}
          href={tab.href}
          role="tab"
          aria-selected={active === tab.id}
          className={cn(
            "border-b-2 pb-3 text-sm font-medium transition-colors",
            active === tab.id
              ? "border-cos-dark text-cos-text"
              : "border-transparent text-cos-muted hover:text-cos-text",
          )}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}
