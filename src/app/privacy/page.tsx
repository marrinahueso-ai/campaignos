import { MarketingWowLegalShell } from "@/components/marketing-wow/MarketingWowLegalShell";
import { PrivacyPolicyContent } from "@/lib/marketing-wow/legal-content";

export const metadata = {
  title: "Privacy Policy",
  description:
    "How Hey Ralli handles account, workspace, integration, and cookie data for school and PTA teams.",
};

export default function PrivacyPage() {
  return (
    <MarketingWowLegalShell>
      <PrivacyPolicyContent />
    </MarketingWowLegalShell>
  );
}
