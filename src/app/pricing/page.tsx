import { MarketingWowPricingPage } from "@/components/marketing-wow/MarketingWowPricingPage";
import type { PricingCtaMode } from "@/components/marketing-wow/MarketingWowPricingPage";
import { hasPermission } from "@/lib/access-templates/effective-access";
import { getAuthUser } from "@/lib/auth/queries";
import { getAuthenticatedAppPath } from "@/lib/auth/post-auth-path";
import { getSettingsBillingContext } from "@/lib/billing/settings-billing";
import { isStripeBillingConfigured } from "@/lib/billing/stripe";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Pricing",
  description:
    "Hey Ralli plans for PTO teams — Starter $49, Professional $79, Premium $129 — with AI credits and AI Reserve add-ons.",
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

export default async function PricingPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const user = await getAuthUser();
  const workspaceHref = user ? await getAuthenticatedAppPath() : "/dashboard";
  const stripeConfigured = isStripeBillingConfigured();

  let ctaMode: PricingCtaMode = "signin";
  let currentPlanId: Awaited<
    ReturnType<typeof getSettingsBillingContext>
  >["currentPlanId"] = null;
  let trialEligible = true;

  if (user) {
    const billing = await getSettingsBillingContext();
    currentPlanId = billing.currentPlanId;
    trialEligible = billing.trialEligible;
    if (billing.isFoundingPartner) {
      ctaMode = "founding";
    } else if (stripeConfigured && (await hasPermission("manage_billing"))) {
      ctaMode = "checkout";
    } else {
      ctaMode = "billing";
    }
  }

  const params = await searchParams;
  const checkout = first(params.checkout);
  const reserve = first(params.reserve);
  let flash: string | null = null;
  if (checkout === "success") {
    flash = "Checkout complete — your plan will update in a moment.";
  } else if (reserve === "success") {
    flash =
      "AI Reserve purchase complete — credits appear after Stripe confirms.";
  } else if (checkout === "canceled" || reserve === "canceled") {
    flash = "Checkout canceled — no charges were made.";
  }

  return (
    <MarketingWowPricingPage
      userEmail={user?.email ?? null}
      workspaceHref={workspaceHref}
      stripeConfigured={stripeConfigured}
      ctaMode={ctaMode}
      currentPlanId={currentPlanId}
      trialEligible={trialEligible}
      flash={flash}
    />
  );
}
