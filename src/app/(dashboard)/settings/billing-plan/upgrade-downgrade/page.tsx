import { redirect } from "next/navigation";

export default function BillingUpgradeDowngradePage() {
  redirect("/settings/billing-plan?view=plans");
}
