import Link from "next/link";
import { ArrowRight, CreditCard, Crown } from "lucide-react";
import { SettingsV2Card } from "@/components/settings-v2/SettingsV2Card";
import { SettingsV2PageHeader } from "@/components/settings-v2/SettingsV2PageHeader";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

interface BillingPlanContentProps {
  planLabel: string;
  isFoundingPartner: boolean;
  renewalLabel: string | null;
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
}: BillingPlanContentProps) {
  return (
    <div className="space-y-6">
      <SettingsV2PageHeader
        title="Billing & Plan"
        description="Manage your subscription, payment method, and usage."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <SettingsV2Card title="Current Plan">
          <div className="flex items-start gap-3">
            <div className="rounded-md border border-cos-border bg-cos-bg p-2">
              <Crown className="h-5 w-5 text-cos-text" strokeWidth={1.5} />
            </div>
            <div>
              <p className="font-display text-2xl text-cos-text">{planLabel}</p>
              {isFoundingPartner ? (
                <p className="mt-1 text-sm text-cos-muted">
                  Founding partner benefits — billing waived during early access.
                </p>
              ) : renewalLabel ? (
                <p className="mt-1 text-sm text-cos-muted">{renewalLabel}</p>
              ) : null}
              <Badge className="mt-3" variant={isFoundingPartner ? "info" : "success"}>
                Active
              </Badge>
            </div>
          </div>
        </SettingsV2Card>

        <SettingsV2Card title="Payment Method">
          <div className="flex items-start gap-3">
            <CreditCard className="mt-0.5 h-5 w-5 text-cos-muted" strokeWidth={1.5} />
            <div>
              <p className="text-sm text-cos-text">
                {isFoundingPartner ? "No payment required" : "Visa ending in 4242"}
              </p>
              {!isFoundingPartner ? (
                <Button
                  className="mt-3"
                  variant="secondary"
                  size="sm"
                  href="/settings/billing-plan/payment-method"
                >
                  Update payment method
                </Button>
              ) : null}
            </div>
          </div>
        </SettingsV2Card>
      </div>

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
