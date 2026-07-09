import Link from "next/link";
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
      <SettingsV2PageHeader
        title={title}
        description={description}
        actions={
          <Button variant="secondary" size="sm" href="/settings/billing-plan">
            Back to billing
          </Button>
        }
      />
      {children}
    </div>
  );
}

export function BillingPaymentMethodContent() {
  return (
    <BillingSubPageShell
      title="Payment Method"
      description="Manage the card or bank account used for your Hey Ralli subscription."
    >
      <SettingsV2Card title="Default payment method">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-cos-text">Visa ending in 4242</p>
            <p className="text-xs text-cos-muted">Expires 12/2028</p>
          </div>
          <span className="rounded-full border border-cos-border px-2 py-0.5 text-xs font-medium text-cos-muted">
            Default
          </span>
        </div>
        <Button className="mt-4" variant="secondary" href="/settings/billing-plan/payment-method">
          Update payment method
        </Button>
      </SettingsV2Card>

      <SettingsV2Card title="Add payment method">
        <div className="grid gap-3 sm:grid-cols-2">
          <Button variant="secondary">Credit card</Button>
          <Button variant="secondary">Bank account</Button>
        </div>
      </SettingsV2Card>
    </BillingSubPageShell>
  );
}

export function BillingHistoryContent() {
  const rows = [
    { date: "Jul 12, 2026", description: "Professional plan", amount: "$29.00", status: "Paid" },
    { date: "Jun 12, 2026", description: "Professional plan", amount: "$29.00", status: "Paid" },
    { date: "May 12, 2026", description: "Professional plan", amount: "$29.00", status: "Paid" },
  ];

  return (
    <BillingSubPageShell
      title="Billing History"
      description="View past invoices and download receipts."
    >
      <SettingsV2Card>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead>
              <tr className="border-b border-cos-border text-xs uppercase tracking-wide text-cos-muted">
                <th className="py-2 pr-4 font-medium">Date</th>
                <th className="py-2 pr-4 font-medium">Description</th>
                <th className="py-2 pr-4 font-medium">Amount</th>
                <th className="py-2 pr-4 font-medium">Status</th>
                <th className="py-2 font-medium">Invoice</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.date} className="border-b border-cos-border last:border-b-0">
                  <td className="py-3 pr-4 text-cos-text">{row.date}</td>
                  <td className="py-3 pr-4 text-cos-muted">{row.description}</td>
                  <td className="py-3 pr-4 text-cos-text">{row.amount}</td>
                  <td className="py-3 pr-4 text-emerald-700">{row.status}</td>
                  <td className="py-3">
                    <Link href="#" className="text-cos-text hover:text-cos-primary">
                      Download
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SettingsV2Card>
    </BillingSubPageShell>
  );
}

export function BillingManagePlanContent() {
  return (
    <BillingSubPageShell
      title="Manage Plan"
      description="Review your current plan, usage, and renewal details."
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <SettingsV2Card title="Professional plan">
          <p className="text-sm text-cos-muted">
            Unlimited campaigns, AI credits, team members, and 10 GB storage.
          </p>
          <p className="mt-2 text-sm text-cos-text">Renews Aug 12, 2026</p>
          <Button className="mt-4" variant="secondary" href="/settings/billing-plan/upgrade-downgrade">
            Change plan
          </Button>
        </SettingsV2Card>

        <SettingsV2Card title="Usage this month">
          {[
            { label: "Campaigns", value: 68 },
            { label: "AI credits", value: 42 },
            { label: "Team members", value: 55 },
            { label: "Storage", value: 24 },
          ].map((item) => (
            <div key={item.label} className="mb-3 last:mb-0">
              <div className="mb-1 flex justify-between text-sm">
                <span className="text-cos-muted">{item.label}</span>
                <span className="text-cos-text">{item.value}%</span>
              </div>
              <div className="h-2 rounded-full bg-cos-bg">
                <div
                  className="h-2 rounded-full bg-cos-primary"
                  style={{ width: `${item.value}%` }}
                />
              </div>
            </div>
          ))}
        </SettingsV2Card>
      </div>

      <Link
        href="/settings/billing-plan/cancel-plan"
        className="text-sm text-cos-muted hover:text-cos-error-text"
      >
        Cancel subscription
      </Link>
    </BillingSubPageShell>
  );
}

export function BillingUpgradeDowngradeContent() {
  const plans = [
    { name: "Starter", price: "$0", description: "Basic tools for small PTOs" },
    { name: "Professional", price: "$29", description: "Full campaign studio + AI", active: true },
    { name: "Premium", price: "$59", description: "Advanced analytics + priority support" },
  ];

  return (
    <BillingSubPageShell
      title="Upgrade / Downgrade"
      description="Compare plans and switch when your PTO is ready."
    >
      <div className="mb-4 flex gap-2">
        <Button size="sm">Monthly</Button>
        <Button size="sm" variant="secondary">
          Yearly
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {plans.map((plan) => (
          <SettingsV2Card key={plan.name} title={plan.name}>
            <p className="font-display text-3xl text-cos-text">{plan.price}</p>
            <p className="mt-2 text-sm text-cos-muted">{plan.description}</p>
            <Button
              className="mt-4"
              variant={plan.active ? "secondary" : "primary"}
              disabled={plan.active}
            >
              {plan.active ? "Current plan" : "Select plan"}
            </Button>
          </SettingsV2Card>
        ))}
      </div>
    </BillingSubPageShell>
  );
}

export function BillingCancelPlanContent() {
  return (
    <BillingSubPageShell
      title="Cancel Plan"
      description="We're sorry to see you go. Review what happens before canceling."
    >
      <SettingsV2Card title="Before you cancel">
        <p className="text-sm leading-relaxed text-cos-muted">
          Your workspace stays active until the end of the current billing period.
          You can export your data anytime from Advanced settings.
        </p>
      </SettingsV2Card>

      <SettingsV2Card title="Before you go">
        <ul className="space-y-2 text-sm text-cos-muted">
          <li>
            <Link href="/settings/advanced" className="text-cos-text hover:text-cos-primary">
              Download your data
            </Link>
          </li>
          <li>
            <Link href="/help" className="text-cos-text hover:text-cos-primary">
              Contact support
            </Link>
          </li>
        </ul>
      </SettingsV2Card>

      <Button variant="danger">Yes, cancel subscription</Button>
    </BillingSubPageShell>
  );
}
