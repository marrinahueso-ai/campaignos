import Link from "next/link";
import { MarketingWowAuthShell } from "@/components/marketing-wow/MarketingWowAuthShell";
import { MarketingWowLegalLinks } from "@/components/marketing-wow/MarketingWowAuthShell";

export const metadata = {
  title: "Accept invite | Hey Ralli",
  description:
    "Open the secure invite link from your PTA admin to join your Hey Ralli workspace.",
};

export default function InviteLandingPage() {
  return (
    <MarketingWowAuthShell
      imageSrc="/images/fall-festival-campaign.png"
      visualTitle="You’re invited."
      visualSupport="Join your school’s Hey Ralli workspace with the role your admin chose."
    >
      <h1>Accept invite</h1>
      <p className="sub">
        Your president or admin sends a secure invite link by email. Open that
        link to set your password and join the workspace — no founding code
        needed.
      </p>
      <div className="invite-callout" style={{ marginTop: 22 }}>
        Don’t have the link yet? Ask your admin to resend it, or{" "}
        <Link href="/login" className="btn-text">
          sign in
        </Link>{" "}
        if you already have an account.
      </div>
      <p className="auth-alt" style={{ marginTop: 28 }}>
        Starting a new organization?{" "}
        <Link href="/signup" className="btn-text">
          Sign up with a founding code
        </Link>
      </p>
      <MarketingWowLegalLinks />
    </MarketingWowAuthShell>
  );
}
