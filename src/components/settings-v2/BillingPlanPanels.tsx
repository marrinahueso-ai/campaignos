import {
  BillingPortalButton,
  PlanCheckoutButton,
  ReserveCheckoutButton,
} from "@/components/settings-v2/BillingCheckoutButtons";
import { SettingsV2Card } from "@/components/settings-v2/SettingsV2Card";
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

interface PanelProps {
  trialEligible?: boolean;
  isFoundingPartner?: boolean;
  planLabel?: string;
  currentPlanId?: PaidPlanId | null;
  stripeConfigured?: boolean;
  hasStripeCustomer?: boolean;
}

const PLAN_CHECKOUT_RETURN_PATH = "/settings/billing-plan?tab=plan";

export function BillingPlanPricingPanel({
  isFoundingPartner = false,
  planLabel = "Professional",
  currentPlanId = null,
  stripeConfigured = false,
  hasStripeCustomer = false,
  trialEligible = false,
}: PanelProps) {
  const plan = planById(currentPlanId ?? PRE_STRIPE_DEFAULT_PLAN_ID);

  return (
    <div className="space-y-6">
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
            {stripeConfigured && hasStripeCustomer ? (
              <div className="mt-4">
                <BillingPortalButton />
              </div>
            ) : null}
          </>
        )}
      </SettingsV2Card>

      {isFoundingPartner ? (
        <p className="rounded-xl border border-cos-border bg-cos-bg px-4 py-3 text-sm text-cos-muted">
          You are on Founding Partner access. Plan changes are not required
          while billing is waived.
        </p>
      ) : !stripeConfigured ? (
        <p className="rounded-xl border border-cos-border bg-cos-bg px-4 py-3 text-sm text-cos-muted">
          {CHECKOUT_COMING_SOON} Stripe is not fully configured on this
          environment yet (missing secret key or plan price IDs).
        </p>
      ) : (
        <p className="rounded-xl border border-cos-border bg-cos-bg px-4 py-3 text-sm text-cos-muted">
          {trialEligible
            ? "Choose a plan to start your 14-day free trial (card required; billed after the trial). Premium is recommended for most schools."
            : "Choose a plan to open Stripe Checkout. Premium is recommended for most schools."}{" "}
          AI Reserve is a one-time add-on that rolls over.
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        {PAID_PLANS.map((planOption) => {
          const isCurrent =
            !isFoundingPartner &&
            currentPlanId != null &&
            planOption.id === currentPlanId;
          return (
            <SettingsV2Card key={planOption.id} title={planOption.displayName}>
              {planOption.badge ? (
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-cos-muted">
                  {planOption.badge}
                </p>
              ) : null}
              <p className="font-display text-3xl text-cos-text">
                {formatPlanPrice(planOption.priceUsd)}
                <span className="ml-1 text-base font-sans text-cos-muted">
                  / mo
                </span>
              </p>
              <p className="mt-1 text-sm font-medium tabular-nums text-cos-text">
                {planOption.monthlyCredits.toLocaleString()} AI credits / month
              </p>
              <p className="mt-2 text-sm text-cos-muted">
                {planOption.description}
              </p>
              <ul className="mt-3 space-y-1.5 text-xs text-cos-muted">
                {planOption.features.slice(0, 4).map((feature) => (
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
                    planId={planOption.id}
                    label={
                      trialEligible
                        ? `Start free trial · ${planOption.name}`
                        : `Choose ${planOption.name}`
                    }
                    variant={planOption.highlighted ? "primary" : "secondary"}
                    returnPath={PLAN_CHECKOUT_RETURN_PATH}
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
                    returnPath={PLAN_CHECKOUT_RETURN_PATH}
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

      {!isFoundingPartner ? (
        stripeConfigured && hasStripeCustomer ? (
          <BillingPortalButton label="Cancel subscription in Stripe" />
        ) : (
          <p className="text-sm text-cos-muted">
            {stripeConfigured
              ? "Subscribe to a plan to manage cancellation in the Stripe Customer Portal."
              : "Cancellation is not available until Stripe is connected."}
          </p>
        )
      ) : null}
    </div>
  );
}

export function BillingPaymentMethodPanel({
  isFoundingPartner = false,
  stripeConfigured = false,
  hasStripeCustomer = false,
}: PanelProps) {
  return (
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
  );
}

export function BillingHistoryPanel({
  isFoundingPartner = false,
  stripeConfigured = false,
  hasStripeCustomer = false,
}: PanelProps) {
  return (
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
  );
}
