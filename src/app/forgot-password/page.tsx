import { MarketingWowAuthShell } from "@/components/marketing-wow/MarketingWowAuthShell";
import { MarketingWowForgotForm } from "@/components/marketing-wow/MarketingWowForgotForm";

export const metadata = {
  title: "Forgot password",
};

export default function ForgotPasswordPage() {
  return (
    <MarketingWowAuthShell
      imageSrc="/images/pricing-community.png"
      visualTitle="We’ll get you back in."
      visualSupport="A short reset link — no drama, no group-chat password hunts."
    >
      <MarketingWowForgotForm />
    </MarketingWowAuthShell>
  );
}
