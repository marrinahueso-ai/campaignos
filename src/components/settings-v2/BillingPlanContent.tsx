import { SettingsEaseBilling } from "@/components/settings-v2/SettingsEaseBilling";
import type { AiCreditsWidgetData } from "@/lib/ai/ai-credits-widget-data";
import type { OrgAiUsageBreakdown } from "@/lib/ai/usage-breakdown";
import type { CapacityUsageEntry } from "@/lib/billing/capacity-usage";
import type { OrgBillingSnapshot } from "@/lib/billing/org-billing";
import type { PaidPlanId } from "@/lib/billing/plan-catalog";
import type { SettingsEaseBillingView } from "@/lib/billing/settings-ease-billing-view";
import type { DisplayInvoice } from "@/lib/billing/stripe-invoices-pure";
import type { OrgStripeBillingDisplay } from "@/lib/billing/stripe-payment-summary-pure";

interface BillingPlanContentProps {
  view: SettingsEaseBillingView;
  planLabel: string;
  isFoundingPartner: boolean;
  aiCredits?: AiCreditsWidgetData | null;
  billing?: OrgBillingSnapshot | null;
  stripeConfigured?: boolean;
  hasStripeCustomer?: boolean;
  currentPlanId?: PaidPlanId | null;
  trialEligible?: boolean;
  checkoutFlash?: string | null;
  capacityUsage?: CapacityUsageEntry[];
  aiUsageBreakdown?: OrgAiUsageBreakdown | null;
  stripeInvoices?: DisplayInvoice[];
  stripeDisplay?: OrgStripeBillingDisplay;
}

export function BillingPlanContent({
  view,
  planLabel,
  isFoundingPartner,
  aiCredits = null,
  billing = null,
  stripeConfigured = false,
  hasStripeCustomer = false,
  currentPlanId = null,
  trialEligible = false,
  checkoutFlash = null,
  capacityUsage = [],
  aiUsageBreakdown = null,
  stripeInvoices = [],
  stripeDisplay = {
    cardLabel: null,
    billingEmail: null,
    renewsOnLabel: null,
  },
}: BillingPlanContentProps) {
  return (
    <SettingsEaseBilling
      view={view}
      planLabel={planLabel}
      isFoundingPartner={isFoundingPartner}
      aiCredits={aiCredits}
      billing={billing}
      stripeConfigured={stripeConfigured}
      hasStripeCustomer={hasStripeCustomer}
      currentPlanId={currentPlanId}
      trialEligible={trialEligible}
      checkoutFlash={checkoutFlash}
      capacityUsage={capacityUsage}
      aiUsageBreakdown={aiUsageBreakdown}
      stripeInvoices={stripeInvoices}
      stripeDisplay={stripeDisplay}
    />
  );
}
