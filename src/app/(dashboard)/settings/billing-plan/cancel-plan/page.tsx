import { redirect } from "next/navigation";

export default function BillingCancelPlanPage() {
  redirect("/settings/billing-plan?view=plans");
}
