import { MarketingAuthCardShell } from "@/components/marketing-wow/MarketingAuthCardShell";
import { MarketingWowForgotForm } from "@/components/marketing-wow/MarketingWowForgotForm";

export const metadata = {
  title: "Forgot password",
};

export default function ForgotPasswordPage() {
  return (
    <MarketingAuthCardShell>
      <MarketingWowForgotForm />
    </MarketingAuthCardShell>
  );
}
