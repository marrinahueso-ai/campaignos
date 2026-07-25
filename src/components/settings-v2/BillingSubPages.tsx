import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import {
  BillingPortalButton,
  PlanCheckoutButton,
  ReserveCheckoutButton,
} from "@/components/settings-v2/BillingCheckoutButtons";
import { SettingsV2Card } from "@/components/settings-v2/SettingsV2Card";
import { SettingsV2PageHeader } from "@/components/settings-v2/SettingsV2PageHeader";
import { Button } from "@/components/ui/Button";
import type { PaidPlanId } from "@/lib/billing/plan-catalog";
import {
  CHECKOUT_COMING_SOON,
  formatPlanPrice,
  PAID_PLANS,
  planById,
  PRE_STRIPE_DEFAULT_PLAN_ID,
  RESERVE_CATALOG,
} from "@/lib/billing/plan-catalog";

interface BillingSubPageShellProps {
  title: string;
  description: string;
  children: React.ReactNode;
}

export function BillingSubPageShell({
  title,
  description,
  children,
}: BillingSubPageShellProps) {
  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/settings/billing-plan"
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-cos-muted transition-colors hover:text-cos-text"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={1.5} />
          Back to Billing & Plan
        </Link>
        <SettingsV2PageHeader title={title} description={description} />
      </div>
      {children}
    </div>
  );
}

interface BillingSubPageProps {
  isFoundingPartner?: boolean;
  planLabel?: string;
  currentPlanId?: PaidPlanId;
  stripeConfigured?: boolean;
  hasStripeCustomer?: boolean;
}

export function BillingPaymentMethodContent({
  isFoundingPartner = false,
  stripeConfigured = false,
  hasStripeCustomer = false,
}: BillingSubPageProps) {
  return (
    <BillingSubPageShell
      title="Payment Method"
      description="Manage the card used for your Hey Ralli subscription."
    >
      <SettingsV2Card title="Default payment method">
        {isFoundingPartner ? (
          <>
            <p className="text-sm font-medium text-cos-text">No payment required</p>
            <p className="mt-1 text-sm text-cos-muted">
              Founding partner access does not need a card on file.
            </p>
          </>
        ) : (
          <>
            <p className="text-sm font-medium text-cos-text">
              {hasStripeCustomer
                ? "Managed in Stripe"
                : "No payment method on file"}
            </p>
            <p className="mt-1 text-sm text-cos-muted">
              {stripeConfigured
                ? hasStripeCustomer
                  ? "Update your card in the Stripe Customer Portal."
                  : "Subscribe to a plan to add a payment method."
                : CHECKOUT_COMING_SOON}
            </p>
            {stripeConfigured && hasStripeCustomer ? (
              <div className="mt-4">
                <BillingPortalButton label="Open Stripe portal" />
              </div>
            ) : null}
          </>
        )}
      </SettingsV2Card>
    </BillingSubPageShell>
  );
}

export function BillingHistoryContent({
  isFoundingPartner = false,
  stripeConfigured = false,
  hasStripeCustomer = false,
}: BillingSubPageProps) {
  return (
    <BillingSubPageShell
      title="Billing History"
      description="Invoices and receipts for your organization."
    >
      <SettingsV2Card title="Invoices">
        {isFoundingPartner ? (
          <p className="text-sm leading-relaxed text-cos-muted">
            No invoices yet. Founding partner billing is waived during early
            access.
          </p>
        ) : (
          <>
            <p className="text-sm leading-relaxed text-cos-muted">
              {stripeConfigured
                ? "Download invoices from the Stripe Customer Portal."
                : "Receipts will appear here when Stripe billing is enabled."}
            </p>
            {stripeConfigured && hasStripeCustomer ? (
              <div className="mt-4">
                <BillingPortalButton label="View invoices in Stripe" />
              </div>
            ) : null}
          </>
        )}
      </SettingsV2Card>
    </BillingSubPageShell>
  );
}

export function BillingManagePlanContent({
  isFoundingPartner = false,
  planLabel = "Professional",
  currentPlanId = PRE_STRIPE_DEFAULT_PLAN_ID,
  stripeConfigured = false,
  hasStripeCustomer = false,
}: BillingSubPageProps) {
  const plan = planById(currentPlanId);

  return (
    <BillingSubPageShell
      title="Manage Plan"
      description="Review your current plan and subscription."
    >
      <SettingsV2Card title={planLabel}>
        {isFoundingPartner ? (
          <>
            <p className="text-sm leading-relaxed text-cos-muted">
              Founding partner benefits — full workspace access with billing
              waived and unlimited AI credits during early access.
            </p>
            <p className="mt-2 text-sm text-cos-text">
              No renewal date while waived
            </p>
          </>
        ) : (
          <>
            <p className="font-display text-3xl text-cos-text">
              {formatPlanPrice(plan.priceUsd)}
              <span className="ml-1 text-base font-sans text-cos-muted">
                / month
              </span>
            </p>
            <p className="mt-2 text-sm leading-relaxed text-cos-muted">
              {plan.description}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                variant="secondary"
                href="/settings/billing-plan/upgrade-downgrade"
              >
                View plan options
              </Button>
              {stripeConfigured && hasStripeCustomer ? (
                <BillingPortalButton />
              ) : null}
            </div>
          </>
        )}
      </SettingsV2Card>

      {!isFoundingPartner ? (
        <Link
          href="/settings/billing-plan/cancel-plan"
          className="text-sm text-cos-muted hover:text-cos-error-text"
        >
          Cancel subscription
        </Link>
      ) : null}
    </BillingSubPageShell>
  );
}

export function BillingUpgradeDowngradeContent({
  isFoundingPartner = false,
  currentPlanId = PRE_STRIPE_DEFAULT_PLAN_ID,
  stripeConfigured = false,
}: BillingSubPageProps) {
  return (
    <BillingSubPageShell
      title="Upgrade / Downgrade"
      description="Compare plans and AI Reserve. Checkout opens Stripe when configured."
    >
      {isFoundingPartner ? (
        <p className="rounded-xl border border-cos-border bg-cos-bg px-4 py-3 text-sm text-cos-muted">
          You are on Founding Partner access. Plan changes are not required while
          billing is waived.
        </p>
      ) : !stripeConfigured ? (
        <p className="rounded-xl border border-cos-border bg-cos-bg px-4 py-3 text-sm text-cos-muted">
          {CHECKOUT_COMING_SOON} Stripe is not fully configured on this
          environment yet (missing secret key or plan price IDs).
        </p>
      ) : (
        <p className="rounded-xl border border-cos-border bg-cos-bg px-4 py-3 text-sm text-cos-muted">
          Choose a plan to open Stripe Checkout. Premium is recommended for most
          schools. AI Reserve is a one-time add-on that rolls over.
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        {PAID_PLANS.map((plan) => {
          const isCurrent =
            !isFoundingPartner && plan.id === currentPlanId;
          return (
            <SettingsV2Card key={plan.id} title={plan.displayName}>
              {plan.badge ? (
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-cos-muted">
                  {plan.badge}
                </p>
              ) : null}
              <p className="font-display text-3xl text-cos-text">
                {formatPlanPrice(plan.priceUsd)}
                <span className="ml-1 text-base font-sans text-cos-muted">
                  / mo
                </span>
              </p>
              <p className="mt-1 text-sm font-medium tabular-nums text-cos-text">
                {plan.monthlyCredits.toLocaleString()} AI credits / month
              </p>
              <p className="mt-2 text-sm text-cos-muted">{plan.description}</p>
              <ul className="mt-3 space-y-1.5 text-xs text-cos-muted">
                {plan.features.slice(0, 4).map((feature) => (
                  <li key={feature}>· {feature}</li>
                ))}
              </ul>
              <div className="mt-4">
                {isFoundingPartner || isCurrent ? (
                  <Button className="w-full" variant="secondary" disabled>
                    {isCurrent ? "Current plan" : "Not required"}
                  </Button>
                ) : stripeConfigured ? (
                  <PlanCheckoutButton
                    planId={plan.id}
                    label={`Choose ${plan.name}`}
                    variant={plan.highlighted ? "primary" : "secondary"}
                  />
                ) : (
                  <Button className="w-full" disabled>
                    Coming soon
                  </Button>
                )}
              </div>
            </SettingsV2Card>
          );
        })}
      </div>

      <SettingsV2Card title="AI Reserve add-ons">
        <p className="text-sm text-cos-muted">
          Reserve stacks on top of monthly credits and rolls over. Owners can
          also grant Reserve from ops.
        </p>
        <ul className="mt-3 grid gap-3 sm:grid-cols-3">
          {RESERVE_CATALOG.map((sku) => (
            <li
              key={sku.id}
              className="rounded-lg border border-cos-border bg-cos-bg px-3 py-3 text-sm"
            >
              <p className="font-medium text-cos-text">{sku.label}</p>
              <p className="text-cos-muted">
                ${sku.priceUsd} · {sku.credits.toLocaleString()} credits
              </p>
              <div className="mt-3">
                {isFoundingPartner ? (
                  <Button className="w-full" variant="secondary" disabled>
                    Unlimited
                  </Button>
                ) : stripeConfigured ? (
                  <ReserveCheckoutButton
                    sku={sku.id}
                    label={`Buy ${sku.label}`}
                  />
                ) : (
                  <Button className="w-full" disabled>
                    Coming soon
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </SettingsV2Card>
    </BillingSubPageShell>
  );
}

export function BillingCancelPlanContent({
  isFoundingPartner = false,
  stripeConfigured = false,
  hasStripeCustomer = false,
}: BillingSubPageProps) {
  return (
    <BillingSubPageShell
      title="Cancel Plan"
      description="Review what happens before ending a paid subscription."
    >
      <SettingsV2Card title="Cancellation">
        {isFoundingPartner ? (
          <p className="text-sm leading-relaxed text-cos-muted">
            Founding partner access is not a paid subscription, so there is
            nothing to cancel here. Contact support if you need to close the
            workspace.
          </p>
        ) : (
          <>
            <p className="text-sm leading-relaxed text-cos-muted">
              {stripeConfigured
                ? "Cancel or change your subscription in the Stripe Customer Portal. Access continues through the end of the paid period."
                : "Paid cancellation is not available until Stripe is connected."}
            </p>
            {stripeConfigured && hasStripeCustomer ? (
              <div className="mt-4">
                <BillingPortalButton label="Manage subscription in Stripe" />
              </div>
            ) : null}
          </>
        )}
      </SettingsV2Card>
    </BillingSubPageShell>
  );
}
