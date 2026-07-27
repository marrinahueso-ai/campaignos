import Link from "next/link";
import { cn } from "@/lib/utils/cn";

export type BillingPlanTab =
  | "overview"
  | "plan"
  | "usage"
  | "payment"
  | "history"
  | "plans";

const TABS: { id: BillingPlanTab; label: string; href: string }[] = [
  { id: "usage", label: "Usage", href: "/settings/billing-plan?view=usage" },
  { id: "plans", label: "Plans", href: "/settings/billing-plan?view=plans" },
  { id: "payment", label: "Payment", href: "/settings/billing-plan?view=payment" },
];

/** @deprecated Prefer billingEaseViewFromParam — kept for legacy ?tab= links. */
export function billingPlanTabFromParam(value: string | undefined): BillingPlanTab {
  if (value === "plans" || value === "plan") return "plans";
  if (value === "payment" || value === "history") return "payment";
  if (value === "usage" || value === "overview") return "usage";
  return "usage";
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
