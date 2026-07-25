import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { SettingsV2Card } from "@/components/settings-v2/SettingsV2Card";
import { SettingsV2PageHeader } from "@/components/settings-v2/SettingsV2PageHeader";
import { Button } from "@/components/ui/Button";
import {
  CHECKOUT_COMING_SOON,
  formatPlanPrice,
  PAID_PLANS,
  planById,
  PRE_STRIPE_DEFAULT_PLAN_ID,
  RESERVE_CATALOG,
  type PaidPlanId,
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
  /** Effective paid plan when not founding (pre-Stripe default = Professional). */
  currentPlanId?: PaidPlanId;
}

export function BillingPaymentMethodContent({
  isFoundingPartner = false,
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
              No payment method on file
            </p>
            <p className="mt-1 text-sm text-cos-muted">{CHECKOUT_COMING_SOON}</p>
          </>
        )}
      </SettingsV2Card>
    </BillingSubPageShell>
  );
}

export function BillingHistoryContent({
  isFoundingPartner = false,
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
            access, so there is nothing to download.
          </p>
        ) : (
          <p className="text-sm leading-relaxed text-cos-muted">
            No invoices yet. Receipts will appear here when Stripe billing is
            enabled for your organization.
          </p>
        )}
      </SettingsV2Card>
    </BillingSubPageShell>
  );
}

export function BillingManagePlanContent({
  isFoundingPartner = false,
  planLabel = "Professional",
  currentPlanId = PRE_STRIPE_DEFAULT_PLAN_ID,
}: BillingSubPageProps) {
  const plan = planById(currentPlanId);

  return (
    <BillingSubPageShell
      title="Manage Plan"
      description="Review your current plan and what checkout will unlock."
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
              {plan.description} Currently metered at{" "}
              {plan.monthlyCredits.toLocaleString()} AI credits / month until
              paid billing connects.
            </p>
            <p className="mt-2 text-sm text-cos-muted">{CHECKOUT_COMING_SOON}</p>
            <Button
              className="mt-4"
              variant="secondary"
              href="/settings/billing-plan/upgrade-downgrade"
            >
              View plan options
            </Button>
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
}: BillingSubPageProps) {
  return (
    <BillingSubPageShell
      title="Upgrade / Downgrade"
      description="Compare locked plan options. Switches unlock when Stripe Checkout is connected."
    >
      {isFoundingPartner ? (
        <p className="rounded-xl border border-cos-border bg-cos-bg px-4 py-3 text-sm text-cos-muted">
          You are on Founding Partner access. Plan changes are not required while
          billing is waived.
        </p>
      ) : (
        <p className="rounded-xl border border-cos-border bg-cos-bg px-4 py-3 text-sm text-cos-muted">
          {CHECKOUT_COMING_SOON} Buttons stay disabled until then.
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
              <Button
                className="mt-4"
                variant={isCurrent ? "secondary" : "primary"}
                disabled
              >
                {isCurrent ? "Current plan" : "Coming soon"}
              </Button>
            </SettingsV2Card>
          );
        })}
      </div>

      <SettingsV2Card title="AI Reserve add-ons">
        <p className="text-sm text-cos-muted">
          Reserve stacks on top of monthly credits and rolls over. Purchase
          unlocks with checkout; Owners can also grant Reserve from ops today.
        </p>
        <ul className="mt-3 grid gap-2 sm:grid-cols-3">
          {RESERVE_CATALOG.map((sku) => (
            <li
              key={sku.id}
              className="rounded-lg border border-cos-border bg-cos-bg px-3 py-2 text-sm"
            >
              <p className="font-medium text-cos-text">{sku.label}</p>
              <p className="text-cos-muted">
                ${sku.priceUsd} · {sku.credits.toLocaleString()} credits
              </p>
            </li>
          ))}
        </ul>
      </SettingsV2Card>
    </BillingSubPageShell>
  );
}

export function BillingCancelPlanContent({
  isFoundingPartner = false,
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
          <p className="text-sm leading-relaxed text-cos-muted">
            Paid cancellation is not available yet. When billing is connected,
            your workspace will stay active through the end of the billing period
            if you cancel.
          </p>
        )}
      </SettingsV2Card>
    </BillingSubPageShell>
  );
}
