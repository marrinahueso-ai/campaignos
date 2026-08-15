import { MarketingWowLegalShell } from "@/components/marketing-wow/MarketingWowLegalShell";
import { TermsOfServiceContent } from "@/lib/marketing-wow/legal-content";

export const metadata = {
  title: "Terms of Service",
  description:
    "Terms of Service for Hey Ralli workspaces, AI features, publishing, billing, and organization accounts."
};

export default function TermsPage() {
  return (
    <MarketingWowLegalShell>
      <TermsOfServiceContent />
    </MarketingWowLegalShell>
  );
}
