import { redirect } from "next/navigation";

export default function BillingCancelPlanPage() {
  redirect("/settings/billing-plan?tab=plan");
}
