import { getAuthUser } from "@/lib/auth/queries";
import { StudioPricingPage } from "@/components/marketing/StudioPricingPage";

export const metadata = {
  title: "Pricing",
  description: "Simple monthly plans for PTO and school volunteer teams — $29, $59, and $99.",
};

export default async function PricingPage() {
  const user = await getAuthUser();

  return <StudioPricingPage userEmail={user?.email ?? null} />;
}
