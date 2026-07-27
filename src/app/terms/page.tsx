import { MarketingWowLegalShell } from "@/components/marketing-wow/MarketingWowLegalShell";
import { TermsOfServiceContent } from "@/lib/marketing-wow/legal-content";

export const metadata = {
  title: "Terms of Service",
  description:
    "Terms for using Hey Ralli workspaces, content, acceptable use, and billing.",
};

export default function TermsPage() {
  return (
    <MarketingWowLegalShell>
      <TermsOfServiceContent />
    </MarketingWowLegalShell>
  );
}
