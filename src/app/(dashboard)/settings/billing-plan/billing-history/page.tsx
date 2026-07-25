import { redirect } from "next/navigation";

export default function BillingHistoryPage() {
  redirect("/settings/billing-plan?tab=history");
}
