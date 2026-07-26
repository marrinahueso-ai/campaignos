import { redirect } from "next/navigation";
import { SignOutForm } from "@/components/auth/SignOutForm";
import { AgreementThemeShell } from "@/components/developer-agreements/AgreementThemeShell";
import { OrganizationSwitcher } from "@/components/layout/OrganizationSwitcher";
import {
  BillingPortalButton,
  PlanCheckoutButton,
} from "@/components/settings-v2/BillingCheckoutButtons";
import { Button } from "@/components/ui/Button";
import { listActiveMemberships } from "@/lib/auth/membership-queries";
import { getAuthUser } from "@/lib/auth/queries";
import { PAID_PLANS } from "@/lib/billing/plan-catalog";
import { getSettingsBillingContext } from "@/lib/billing/settings-billing";
import { isSnapshotCanceledLockout } from "@/lib/billing/subscription-lockout";

/** Org billing status must be read fresh on every visit — never cached/static. */
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Subscription canceled",
};

export default async function BillingCanceledPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await getAuthUser();
  if (!user) {
    redirect("/login");
  }

  const [ctx, organizations, params] = await Promise.all([
    getSettingsBillingContext(),
    listActiveMemberships(),
    searchParams,
  ]);

  const isCanceled =
    ctx.organization != null &&
    ctx.billing != null &&
    isSnapshotCanceledLockout(ctx.billing);

  // Direct visits from a non-canceled org (bookmark, stale link, resolved
  // already) go back to the app instead of showing a stale lockout screen.
  if (!isCanceled) {
    redirect("/dashboard");
  }

  const organization = ctx.organization!;
  const orgName = organization.name?.trim() || "Your organization";
  const checkoutFlash =
    params.checkout === "success"
      ? "Checkout complete — access restores as soon as Stripe confirms the payment."
      : params.checkout === "canceled"
        ? "Checkout canceled — no charges were made."
        : null;

  return (
    <AgreementThemeShell eyebrow="Subscription canceled">
      <h1 className="font-serif text-3xl text-cos-text md:text-4xl">
        Subscription canceled for {orgName}
      </h1>
      <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-cos-muted">
        The paid subscription for this organization was canceled in Stripe, so
        Hey Ralli access is on hold for every member of {orgName} until it is
        resubscribed. Nothing has been deleted — choose a plan below to
        restore access for the whole team, or open the Stripe billing portal
        to review what happened.
      </p>

      {checkoutFlash ? (
        <p className="mt-4 max-w-2xl rounded-xl border border-cos-border bg-cos-card px-4 py-3 text-sm text-cos-text">
          {checkoutFlash}
        </p>
      ) : null}

      {organizations.length > 1 ? (
        <div className="mt-6 flex flex-wrap items-center gap-2 text-sm text-cos-muted">
          <span>Have another organization? Switch to it:</span>
          <OrganizationSwitcher
            organizations={organizations}
            activeOrganizationId={organization.id}
          />
        </div>
      ) : null}

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {PAID_PLANS.map((plan) => (
          <div
            key={plan.id}
            className="flex flex-col gap-3 rounded-2xl border border-cos-border bg-cos-card p-5 shadow-sm"
          >
            <div>
              <p className="font-serif text-xl text-cos-text">
                {plan.displayName}
              </p>
              <p className="text-sm text-cos-muted">${plan.priceUsd}/mo</p>
            </div>
            <PlanCheckoutButton
              planId={plan.id}
              label={`Resubscribe to ${plan.name}`}
              returnPath="/billing/canceled"
              variant={plan.highlighted ? "primary" : "secondary"}
            />
          </div>
        ))}
      </div>

      <div className="mt-8 flex flex-wrap items-center gap-4 text-sm">
        {ctx.hasStripeCustomer ? (
          <BillingPortalButton label="Open Stripe billing portal" />
        ) : null}
        <SignOutForm>
          <Button type="submit" variant="tertiary">
            Sign out
          </Button>
        </SignOutForm>
      </div>
    </AgreementThemeShell>
  );
}
