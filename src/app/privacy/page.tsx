import { MarketingWowLegalShell } from "@/components/marketing-wow/MarketingWowLegalShell";
import { PrivacyPolicyContent } from "@/lib/marketing-wow/legal-content";

export const metadata = {
  title: "Privacy Policy",
  description:
    "How Hey Ralli collects, uses, and protects information — including Meta/Facebook user data deletion instructions.",
};

export default function PrivacyPage() {
  return (
    <MarketingWowLegalShell>
      <PrivacyPolicyContent />
    </MarketingWowLegalShell>
  );
}
