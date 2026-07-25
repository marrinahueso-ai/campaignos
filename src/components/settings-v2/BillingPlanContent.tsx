import Link from "next/link";
import { ArrowRight, CreditCard, Crown } from "lucide-react";
import {
  BillingPortalButton,
  PlanCheckoutButton,
} from "@/components/settings-v2/BillingCheckoutButtons";
import { SettingsV2Card } from "@/components/settings-v2/SettingsV2Card";
import { SettingsV2PageHeader } from "@/components/settings-v2/SettingsV2PageHeader";
import { Badge } from "@/components/ui/Badge";
import type { AiCreditsWidgetData } from "@/lib/ai/ai-credits-widget-data";
import type { OrgBillingSnapshot } from "@/lib/billing/org-billing";
import { formatTrialRemaining } from "@/lib/billing/org-billing";
import {
  CHECKOUT_COMING_SOON,
  planById,
  PRE_STRIPE_DEFAULT_PLAN_ID,
} from "@/lib/billing/plan-catalog";
import { paidPlanIdFromTier } from "@/lib/billing/entitlements";

interface BillingPlanContentProps {
  planLabel: string;
  isFoundingPartner: boolean;
  renewalLabel: string | null;
  aiCredits?: AiCreditsWidgetData | null;
  billing?: OrgBillingSnapshot | null;
  stripeConfigured?: boolean;
  checkoutFlash?: string | null;
}

const BILLING_LINKS = [
  { href: "/settings/billing-plan/payment-method", label: "Payment method" },
  { href: "/settings/billing-plan/billing-history", label: "Billing history" },
  { href: "/settings/billing-plan/manage-plan", label: "Manage plan" },
  { href: "/settings/billing-plan/upgrade-downgrade", label: "Upgrade / downgrade" },
  { href: "/settings/billing-plan/cancel-plan", label: "Cancel plan" },
] as const;

export function BillingPlanContent({
  planLabel,
  isFoundingPartner,
  renewalLabel,
  aiCredits = null,
  billing = null,
  stripeConfigured = false,
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

      {checkoutFlash ? (
        <p
          className="rounded-xl border border-cos-border bg-cos-bg px-4 py-3 text-sm text-cos-text"
          role="status"
        >
          {checkoutFlash}
        </p>
      ) : null}

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
                      label="Subscribe to Professional"
                    />
                  ) : null}
                  {billing?.stripeCustomerId ? (
                    <BillingPortalButton />
                  ) : null}
                  <ButtonLink href="/settings/billing-plan/upgrade-downgrade">
                    Compare plans
                  </ButtonLink>
                </div>
              ) : null}
            </div>
          </div>
        </SettingsV2Card>

        <SettingsV2Card title="Payment Method">
          <div className="flex items-start gap-3">
            <CreditCard className="mt-0.5 h-5 w-5 text-cos-muted" strokeWidth={1.5} />
            <div className="min-w-0 flex-1 space-y-3">
              <div>
                <p className="text-sm text-cos-text">
                  {isFoundingPartner
                    ? "No payment required"
                    : billing?.stripeCustomerId
                      ? "Managed in Stripe Customer Portal"
                      : "No payment method on file"}
                </p>
                <p className="mt-1 text-sm text-cos-muted">
                  {isFoundingPartner
                    ? "No card is stored for founding partner access."
                    : stripeConfigured
                      ? "Add or update your card via the Stripe portal after you subscribe."
                      : "A card will appear here when Stripe Checkout is configured."}
                </p>
              </div>
              {!isFoundingPartner &&
              stripeConfigured &&
              billing?.stripeCustomerId ? (
                <BillingPortalButton label="Open payment portal" />
              ) : null}
            </div>
          </div>
        </SettingsV2Card>
      </div>

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
              Soft warnings only — hard stop at 0 ships later.
            </p>
            {aiCredits.softWarn ? (
              <p className="mt-2 text-sm text-cos-warning-text">
                Running low — upgrade or buy AI Reserve from Upgrade / Downgrade
                {stripeConfigured ? "" : " when Stripe is configured"}.
              </p>
            ) : null}
            <p className="mt-2 text-xs text-cos-muted">{aiCredits.resetLabel}</p>
          </>
        ) : (
          <p className="text-sm leading-relaxed text-cos-muted">
            AI credits reset monthly. Balances are metered with soft warnings
            only.
          </p>
        )}
      </SettingsV2Card>

      <SettingsV2Card title="Billing sections">
        <ul className="divide-y divide-cos-border">
          {BILLING_LINKS.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="flex items-center justify-between py-3 text-sm font-medium text-cos-text transition-colors hover:text-cos-primary"
              >
                {link.label}
                <ArrowRight className="h-4 w-4 text-cos-muted" strokeWidth={1.5} />
              </Link>
            </li>
          ))}
        </ul>
      </SettingsV2Card>
    </div>
  );
}

function ButtonLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="inline-flex items-center justify-center rounded-lg border border-cos-border bg-cos-card px-3 py-2 text-sm font-medium text-cos-text hover:bg-cos-bg"
    >
      {children}
    </Link>
  );
}
