import { redirect } from "next/navigation";

export default function BillingManagePlanPage() {
  redirect("/settings/billing-plan?tab=plan");
}
