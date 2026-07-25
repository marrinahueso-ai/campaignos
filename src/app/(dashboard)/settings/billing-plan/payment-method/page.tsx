import { redirect } from "next/navigation";

export default function BillingPaymentMethodPage() {
  redirect("/settings/billing-plan?tab=payment");
}
