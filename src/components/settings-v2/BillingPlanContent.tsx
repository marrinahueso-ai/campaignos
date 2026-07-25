import { Crown } from "lucide-react";
import {
  BillingPortalButton,
  PlanCheckoutButton,
} from "@/components/settings-v2/BillingCheckoutButtons";
import {
  BillingHistoryPanel,
  BillingPaymentMethodPanel,
  BillingPlanPricingPanel,
} from "@/components/settings-v2/BillingPlanPanels";
import {
  BillingPlanTabs,
  type BillingPlanTab,
} from "@/components/settings-v2/BillingPlanTabs";
import { SettingsV2Card } from "@/components/settings-v2/SettingsV2Card";
import { SettingsV2PageHeader } from "@/components/settings-v2/SettingsV2PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import type { AiCreditsWidgetData } from "@/lib/ai/ai-credits-widget-data";
import type { OrgBillingSnapshot } from "@/lib/billing/org-billing";
import { formatTrialRemaining } from "@/lib/billing/org-billing";
import type { PaidPlanId } from "@/lib/billing/plan-catalog";
import {
  CHECKOUT_COMING_SOON,
  planById,
  PRE_STRIPE_DEFAULT_PLAN_ID,
} from "@/lib/billing/plan-catalog";
import { paidPlanIdFromTier } from "@/lib/billing/entitlements";

interface BillingPlanContentProps {
  tab: BillingPlanTab;
  planLabel: string;
  isFoundingPartner: boolean;
  renewalLabel: string | null;
  aiCredits?: AiCreditsWidgetData | null;
  billing?: OrgBillingSnapshot | null;
  stripeConfigured?: boolean;
  hasStripeCustomer?: boolean;
  currentPlanId?: PaidPlanId | null;
  trialEligible?: boolean;
  checkoutFlash?: string | null;
}

export function BillingPlanContent({
  tab,
  planLabel,
  isFoundingPartner,
  renewalLabel,
  aiCredits = null,
  billing = null,
  stripeConfigured = false,
  hasStripeCustomer = false,
  currentPlanId = null,
  trialEligible = false,
  checkoutFlash = null,
}: BillingPlanContentProps) {
  const defaultPlan = planById(PRE_STRIPE_DEFAULT_PLAN_ID);
  const trialLabel = formatTrialRemaining(billing?.trialEndsAt ?? null);
  const currentPaidId = billing
    ? paidPlanIdFromTier(
        billing.trialActive
          ? "trial"
          : billing.planTier === "starter" ||
              billing.planTier === "professional" ||
              billing.planTier === "premium"
            ? billing.planTier
            : PRE_STRIPE_DEFAULT_PLAN_ID,
      )
    : PRE_STRIPE_DEFAULT_PLAN_ID;

  return (
    <div className="space-y-6">
      <SettingsV2PageHeader
        title="Billing & Plan"
        description="Subscription, AI credits, and payment for this organization."
      />

      <BillingPlanTabs active={tab} />

      {checkoutFlash ? (
        <p
          className="rounded-xl border border-cos-border bg-cos-bg px-4 py-3 text-sm text-cos-text"
          role="status"
        >
          {checkoutFlash}
        </p>
      ) : null}

      {tab === "plan" ? (
        <BillingPlanPricingPanel
          isFoundingPartner={isFoundingPartner}
          planLabel={planLabel}
          currentPlanId={currentPlanId}
          stripeConfigured={stripeConfigured}
          hasStripeCustomer={hasStripeCustomer}
          trialEligible={trialEligible}
        />
      ) : tab === "payment" ? (
        <BillingPaymentMethodPanel
          isFoundingPartner={isFoundingPartner}
          stripeConfigured={stripeConfigured}
          hasStripeCustomer={hasStripeCustomer}
        />
      ) : tab === "history" ? (
        <BillingHistoryPanel
          isFoundingPartner={isFoundingPartner}
          stripeConfigured={stripeConfigured}
          hasStripeCustomer={hasStripeCustomer}
        />
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <SettingsV2Card title="Current Plan">
            <div className="flex items-start gap-3">
              <div className="rounded-md border border-cos-border bg-cos-bg p-2">
                <Crown className="h-5 w-5 text-cos-text" strokeWidth={1.5} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-display text-2xl text-cos-text">{planLabel}</p>
                {isFoundingPartner ? (
                  <p className="mt-1 text-sm text-cos-muted">
                    Founding partner benefits — billing waived and AI credits
                    unlimited during early access.
                  </p>
                ) : billing?.trialActive ? (
                  <p className="mt-1 text-sm text-cos-muted">
                    14-day trial with Professional features and{" "}
                    {aiCredits?.allowance ?? 600} AI credits.{" "}
                    {trialLabel ? `${trialLabel}.` : null}
                  </p>
                ) : billing?.trialExpired ? (
                  <p className="mt-1 text-sm text-cos-muted">
                    Your trial has ended. Choose a plan to restore Professional
                    features. You currently have Starter entitlements.
                  </p>
                ) : renewalLabel ? (
                  <p className="mt-1 text-sm text-cos-muted">{renewalLabel}</p>
                ) : billing?.subscriptionStatus === "active" ? (
                  <p className="mt-1 text-sm text-cos-muted">
                    Active paid subscription
                    {currentPaidId
                      ? ` · ${planById(currentPaidId).displayName}`
                      : ""}
                    .
                  </p>
                ) : (
                  <p className="mt-1 text-sm text-cos-muted">
                    Metered as {defaultPlan.displayName} until you subscribe.
                    {!stripeConfigured ? ` ${CHECKOUT_COMING_SOON}` : null}
                  </p>
                )}
                <Badge
                  className="mt-3"
                  variant={
                    isFoundingPartner
                      ? "info"
                      : billing?.trialExpired
                        ? "warning"
                        : "success"
                  }
                >
                  {billing?.trialActive
                    ? "Trial"
                    : billing?.trialExpired
                      ? "Trial ended"
                      : "Active"}
                </Badge>

                {!isFoundingPartner && stripeConfigured ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {billing?.trialExpired || billing?.trialActive ? (
                      <PlanCheckoutButton
                        planId="professional"
                        label={
                          billing.trialExpired
                            ? "Subscribe to Professional"
                            : "Continue with 14-day free trial"
                        }
                      />
                    ) : null}
                    {billing?.stripeCustomerId ? (
                      <BillingPortalButton />
                    ) : null}
                    <Button variant="secondary" href="/settings/billing-plan?tab=plan">
                      Compare plans
                    </Button>
                  </div>
                ) : null}
              </div>
            </div>
          </SettingsV2Card>

          <SettingsV2Card title="AI credits">
            {aiCredits?.unlimited ? (
              <p className="text-sm leading-relaxed text-cos-muted">
                This organization has unlimited AI credits (founding / billing
                exempt). Usage is still logged for ops.
              </p>
            ) : aiCredits ? (
              <>
                <p className="text-sm font-medium text-cos-text tabular-nums">
                  {aiCredits.used} / {aiCredits.allowance} used
                  {billing?.trialActive ? " (trial pool)" : " this month"}
                  {aiCredits.reserveBalance > 0
                    ? ` · ${aiCredits.reserveBalance.toLocaleString()} reserve`
                    : ""}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-cos-muted">
                  {billing?.trialActive
                    ? "Trial credits are a single 600-credit pool for the 14-day window (not a full Pro month)."
                    : "Monthly plan credits reset on the 1st (UTC) and do not roll over. AI Reserve rolls over until used."}{" "}
                  AI pauses when period + Reserve hit 0.
                </p>
                {aiCredits.exhausted ? (
                  <p className="mt-2 text-sm text-cos-error-text">
                    Out of AI credits — upgrade or buy AI Reserve to resume
                    generation
                    {stripeConfigured ? "" : " when Stripe is configured"}.
                  </p>
                ) : aiCredits.softWarn ? (
                  <p className="mt-2 text-sm text-cos-warning-text">
                    Running low — upgrade or buy AI Reserve from Plan &amp;
                    Pricing
                    {stripeConfigured ? "" : " when Stripe is configured"}.
                  </p>
                ) : null}
                <p className="mt-2 text-xs text-cos-muted">{aiCredits.resetLabel}</p>
              </>
            ) : (
              <p className="text-sm leading-relaxed text-cos-muted">
                AI credits reset monthly. Soft warnings appear when low; AI pauses at
                0 until you upgrade or buy Reserve.
              </p>
            )}
          </SettingsV2Card>
        </div>
      )}
    </div>
  );
}
