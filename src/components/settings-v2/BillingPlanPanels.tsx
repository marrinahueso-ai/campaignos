import {
  BillingPortalButton,
  PlanCheckoutButton,
  ReserveCheckoutButton,
} from "@/components/settings-v2/BillingCheckoutButtons";
import { RecentActivityList } from "@/components/settings-v2/RecentActivityList";
import { SettingsV2Card } from "@/components/settings-v2/SettingsV2Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Crown } from "lucide-react";
import type { AiCreditsWidgetData } from "@/lib/ai/ai-credits-widget-data";
import type { AiCreditLedgerEntry } from "@/lib/ai/credit-ledger";
import type { OrgAiUsageBreakdown } from "@/lib/ai/usage-breakdown";
import type { CapacityUsageEntry } from "@/lib/billing/capacity-usage";
import type { OrgBillingSnapshot } from "@/lib/billing/org-billing";
import type { PaidPlanId } from "@/lib/billing/plan-catalog";
import {
  CHECKOUT_COMING_SOON,
  formatPlanPrice,
  PAID_PLANS,
  planById,
  PRE_STRIPE_DEFAULT_PLAN_ID,
  RESERVE_CATALOG,
} from "@/lib/billing/plan-catalog";
import {
  formatInvoiceAmount,
  invoiceStatusBadgeVariant,
  invoiceStatusLabel,
  type DisplayInvoice,
} from "@/lib/billing/stripe-invoices-pure";
import { cn } from "@/lib/utils/cn";
import { formatDateTime } from "@/lib/utils/dates";

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

interface BillingUsagePanelProps {
  aiCredits?: AiCreditsWidgetData | null;
  billing?: OrgBillingSnapshot | null;
  capacityUsage?: CapacityUsageEntry[];
  ledger?: AiCreditLedgerEntry[];
  usageBreakdown?: OrgAiUsageBreakdown | null;
  stripeConfigured?: boolean;
  isFoundingPartner?: boolean;
}

export function BillingUsagePanel({
  aiCredits = null,
  billing = null,
  capacityUsage = [],
  ledger = [],
  usageBreakdown = null,
  stripeConfigured = false,
  isFoundingPartner = false,
}: BillingUsagePanelProps) {
  const percent =
    aiCredits && !aiCredits.unlimited && aiCredits.allowance > 0
      ? Math.min(100, Math.round((aiCredits.used / aiCredits.allowance) * 100))
      : 0;
  const alert = Boolean(aiCredits?.exhausted || aiCredits?.softWarn);

  const byMember = usageBreakdown?.byMember ?? [];
  const byCategory = usageBreakdown?.byCategory ?? [];
  const topMember = byMember.find((entry) => entry.userId != null) ?? null;
  const maxMemberCredits = Math.max(1, ...byMember.map((entry) => entry.credits));
  const maxCategoryCredits = Math.max(1, ...byCategory.map((entry) => entry.credits));

  return (
    <div className="space-y-6">
      {aiCredits?.unlimited ? (
        <SettingsV2Card title="AI credits">
          <p className="text-sm leading-relaxed text-cos-muted">
            This organization has unlimited AI credits (founding / billing
            exempt). Usage is still logged for ops.
          </p>
        </SettingsV2Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <SettingsV2Card title="Period usage">
            {aiCredits ? (
              <>
                <p className="text-sm font-medium text-cos-text tabular-nums">
                  {aiCredits.used} / {aiCredits.allowance} used
                  {billing?.trialActive ? " (trial pool)" : " this month"}
                </p>
                <div
                  className="mt-2 h-1.5 w-full overflow-hidden bg-cos-border/60"
                  role="progressbar"
                  aria-valuenow={aiCredits.used}
                  aria-valuemin={0}
                  aria-valuemax={aiCredits.allowance}
                  aria-label={`${aiCredits.used} of ${aiCredits.allowance} AI credits used`}
                >
                  <div
                    className={cn(
                      "h-full transition-[width]",
                      alert ? "bg-cos-error" : "bg-cos-dark",
                    )}
                    style={{ width: `${percent}%` }}
                  />
                </div>
                <p className="mt-2 text-sm leading-relaxed text-cos-muted">
                  {billing?.trialActive
                    ? "Trial credits are a single 600-credit pool for the 14-day window (not a full Pro month)."
                    : "Monthly credits reset every 1st and any unused ones expire. Reserve credits never expire — they kick in automatically once your monthly credits run out. AI pauses only if you're out of both."}
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

          <SettingsV2Card title="AI Reserve">
            <p className="text-sm font-medium text-cos-text tabular-nums">
              {(aiCredits?.reserveBalance ?? 0).toLocaleString()} reserve credits
            </p>
            <p className="mt-2 text-sm leading-relaxed text-cos-muted">
              Reserve credits never expire — they roll over and kick in
              automatically once your monthly credits run out.
            </p>
            <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-cos-muted">
              Buy more Reserve
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
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <SettingsV2Card
          title="Capacity usage"
          description="Where this organization stands against plan limits."
        >
          {capacityUsage.length === 0 ? (
            <p className="text-sm text-cos-muted">Capacity usage is unavailable right now.</p>
          ) : (
            <ul className="space-y-4">
              {capacityUsage.map((entry) => {
                const capacityPercent =
                  entry.limit == null || entry.limit <= 0
                    ? 0
                    : Math.min(100, Math.round((entry.used / entry.limit) * 100));
                const atOrOverLimit = entry.limit != null && entry.used >= entry.limit;
                return (
                  <li key={entry.key}>
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="text-sm font-medium text-cos-text">{entry.label}</p>
                      <p className="text-sm tabular-nums text-cos-muted">
                        {entry.limit == null
                          ? `${entry.used.toLocaleString()} · Unlimited`
                          : `${entry.used.toLocaleString()} / ${entry.limit.toLocaleString()}`}
                      </p>
                    </div>
                    {entry.limit != null ? (
                      <div
                        className="mt-2 h-1.5 w-full overflow-hidden bg-cos-border/60"
                        role="progressbar"
                        aria-valuenow={Math.min(entry.used, entry.limit)}
                        aria-valuemin={0}
                        aria-valuemax={entry.limit}
                        aria-label={`${entry.label}: ${entry.used} of ${entry.limit} used`}
                      >
                        <div
                          className={cn(
                            "h-full transition-[width]",
                            atOrOverLimit ? "bg-cos-error" : "bg-cos-dark",
                          )}
                          style={{ width: `${capacityPercent}%` }}
                        />
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </SettingsV2Card>

        <SettingsV2Card
          title="Usage by member"
          description="Who's using the most AI this period, ranked by credits."
        >
          {byMember.length === 0 ? (
            <p className="text-sm text-cos-muted">
              No AI usage from members yet this period.
            </p>
          ) : (
            <ul className="space-y-4">
              {byMember.map((entry, index) => {
                const isTop = topMember != null && entry.userId === topMember.userId;
                const memberPercent = Math.round((entry.credits / maxMemberCredits) * 100);
                return (
                  <li key={entry.userId ?? "unknown"}>
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="flex min-w-0 items-center gap-1.5 truncate text-sm font-medium text-cos-text">
                        <span className="shrink-0 tabular-nums text-cos-muted">
                          {index + 1}.
                        </span>
                        {isTop ? (
                          <Crown
                            className="h-4 w-4 shrink-0 text-cos-warning-text"
                            strokeWidth={1.75}
                            aria-label="Top member"
                          />
                        ) : null}
                        <span className="truncate">{entry.label}</span>
                        {isTop ? (
                          <Badge variant="info" className="shrink-0 align-middle">
                            Top
                          </Badge>
                        ) : null}
                      </p>
                      <p className="shrink-0 text-sm tabular-nums text-cos-muted">
                        {entry.count.toLocaleString()} action{entry.count === 1 ? "" : "s"} ·{" "}
                        <span className="font-medium text-cos-text">
                          {entry.credits.toLocaleString()} cr
                        </span>
                      </p>
                    </div>
                    <div
                      className="mt-2 h-1.5 w-full overflow-hidden bg-cos-border/60"
                      role="progressbar"
                      aria-valuenow={entry.credits}
                      aria-valuemin={0}
                      aria-valuemax={maxMemberCredits}
                      aria-label={`${entry.label}: ${entry.credits} credits used`}
                    >
                      <div
                        className="h-full bg-cos-dark transition-[width]"
                        style={{ width: `${memberPercent}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          {byMember.some((entry) => entry.userId == null) ? (
            <p className="mt-3 text-xs text-cos-muted">
              &ldquo;Unknown member&rdquo; is usage logged before member
              attribution was added for this action type — not a bug.
            </p>
          ) : null}
        </SettingsV2Card>

        <SettingsV2Card
          title="Usage by category"
          description="Full breakdown of what this organization is using AI for, highest first."
        >
          {byCategory.length === 0 ? (
            <p className="text-sm text-cos-muted">No AI usage yet this period.</p>
          ) : (
            <ul className="space-y-4">
              {byCategory.map((entry) => {
                const categoryPercent = Math.round((entry.credits / maxCategoryCredits) * 100);
                return (
                  <li key={entry.key}>
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="min-w-0 flex-1 truncate text-sm font-medium text-cos-text">
                        {entry.label}
                      </p>
                      <p className="shrink-0 text-sm tabular-nums text-cos-muted">
                        {entry.count.toLocaleString()} action{entry.count === 1 ? "" : "s"} ·{" "}
                        <span className="font-medium text-cos-text">
                          {entry.credits.toLocaleString()} cr
                        </span>
                      </p>
                    </div>
                    <div
                      className="mt-2 h-1.5 w-full overflow-hidden bg-cos-border/60"
                      role="progressbar"
                      aria-valuenow={entry.credits}
                      aria-valuemin={0}
                      aria-valuemax={maxCategoryCredits}
                      aria-label={`${entry.label}: ${entry.credits} credits used`}
                    >
                      <div
                        className="h-full bg-cos-dark transition-[width]"
                        style={{ width: `${categoryPercent}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </SettingsV2Card>
      </div>

      <SettingsV2Card
        title="Recent activity"
        description="Latest AI credit grants and usage for this organization."
      >
        <RecentActivityList ledger={ledger} />
      </SettingsV2Card>
    </div>
  );
}

interface BillingHistoryPanelProps extends PanelProps {
  invoices?: DisplayInvoice[];
}

export function BillingHistoryPanel({
  isFoundingPartner = false,
  stripeConfigured = false,
  hasStripeCustomer = false,
  invoices = [],
}: BillingHistoryPanelProps) {
  return (
    <SettingsV2Card title="Invoices">
      {isFoundingPartner ? (
        <p className="text-sm leading-relaxed text-cos-muted">
          No invoices yet. Founding partner billing is waived during early
          access.
        </p>
      ) : !stripeConfigured ? (
        <p className="text-sm leading-relaxed text-cos-muted">
          Receipts will appear here when Stripe billing is enabled.
        </p>
      ) : !hasStripeCustomer ? (
        <p className="text-sm leading-relaxed text-cos-muted">
          No billing history yet — subscribe to a plan to get started.
        </p>
      ) : (
        <>
          {invoices.length === 0 ? (
            <p className="text-sm leading-relaxed text-cos-muted">
              No invoices yet.
            </p>
          ) : (
            <ul className="divide-y divide-cos-border">
              {invoices.map((invoice) => (
                <li
                  key={invoice.id}
                  className="flex flex-wrap items-center gap-x-3 gap-y-1 py-3 text-sm first:pt-0 last:pb-0"
                >
                  <Badge
                    variant={invoiceStatusBadgeVariant(invoice.status)}
                    className="shrink-0"
                  >
                    {invoiceStatusLabel(invoice.status)}
                  </Badge>
                  <p className="shrink-0 text-xs text-cos-muted">
                    {formatDateTime(invoice.createdAt)}
                  </p>
                  <p className="min-w-0 flex-1 truncate text-cos-muted">
                    {invoice.description ?? invoice.number ?? "Invoice"}
                  </p>
                  <p className="shrink-0 text-sm font-medium tabular-nums text-cos-text">
                    {formatInvoiceAmount(invoice.amountCents, invoice.currency)}
                  </p>
                  <div className="flex shrink-0 items-center gap-3">
                    {invoice.hostedInvoiceUrl ? (
                      <a
                        href={invoice.hostedInvoiceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm font-medium text-cos-accent underline-offset-2 hover:underline"
                      >
                        View invoice
                      </a>
                    ) : null}
                    {invoice.invoicePdfUrl ? (
                      <a
                        href={invoice.invoicePdfUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm font-medium text-cos-accent underline-offset-2 hover:underline"
                      >
                        Download PDF
                      </a>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-4">
            <BillingPortalButton label="Manage billing in Stripe" />
          </div>
        </>
      )}
    </SettingsV2Card>
  );
}
