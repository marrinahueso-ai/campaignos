import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { SettingsV2Card } from "@/components/settings-v2/SettingsV2Card";
import { SettingsV2PageHeader } from "@/components/settings-v2/SettingsV2PageHeader";
import { Button } from "@/components/ui/Button";

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
            <p className="text-sm font-medium text-cos-text">No payment method on file</p>
            <p className="mt-1 text-sm text-cos-muted">
              Card checkout is not connected yet. You will add a payment method
              here when billing goes live for your organization.
            </p>
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
            No invoices yet. When paid billing is enabled for your organization,
            receipts will appear here.
          </p>
        )}
      </SettingsV2Card>
    </BillingSubPageShell>
  );
}

export function BillingManagePlanContent({
  isFoundingPartner = false,
  planLabel = "Professional",
}: BillingSubPageProps) {
  return (
    <BillingSubPageShell
      title="Manage Plan"
      description="Review your current plan and renewal details."
    >
      <SettingsV2Card title={planLabel}>
        {isFoundingPartner ? (
          <>
            <p className="text-sm leading-relaxed text-cos-muted">
              Founding partner benefits — full workspace access with billing
              waived during early access.
            </p>
            <p className="mt-2 text-sm text-cos-text">No renewal date while waived</p>
          </>
        ) : (
          <>
            <p className="text-sm leading-relaxed text-cos-muted">
              Your organization plan details will appear here once paid billing
              is connected.
            </p>
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
}: BillingSubPageProps) {
  const plans = [
    {
      name: "Starter",
      price: "$0",
      description: "Core tools to get your first campaigns organized.",
    },
    {
      name: "Professional",
      price: "$29",
      description: "Full campaign studio + AI for growing teams.",
      active: !isFoundingPartner,
    },
    {
      name: "Premium",
      price: "$59",
      description: "Advanced analytics + priority support.",
    },
  ];

  return (
    <BillingSubPageShell
      title="Upgrade / Downgrade"
      description="Compare plan options. Paid switches unlock when billing is connected."
    >
      {isFoundingPartner ? (
        <p className="rounded-xl border border-cos-border bg-cos-bg px-4 py-3 text-sm text-cos-muted">
          You are on Founding Partner access. Plan changes are not required while
          billing is waived.
        </p>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        {plans.map((plan) => (
          <SettingsV2Card key={plan.name} title={plan.name}>
            <p className="font-display text-3xl text-cos-text">{plan.price}</p>
            <p className="mt-2 text-sm text-cos-muted">{plan.description}</p>
            <Button
              className="mt-4"
              variant={plan.active ? "secondary" : "primary"}
              disabled
            >
              {plan.active ? "Current plan" : "Coming soon"}
            </Button>
          </SettingsV2Card>
        ))}
      </div>
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
