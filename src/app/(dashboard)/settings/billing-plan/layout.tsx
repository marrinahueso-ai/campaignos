/**
 * Billing pages must read Stripe env + org subscription at request time.
 * Without this, Next may statically bake stripeConfigured=false at build.
 */
export const dynamic = "force-dynamic";

export default function BillingPlanLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
