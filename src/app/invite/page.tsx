import Link from "next/link";
import {
  MarketingAuthBackLink,
  MarketingAuthCardShell,
  MarketingAuthLegalNote,
} from "@/components/marketing-wow/MarketingAuthCardShell";
import {
  authSubClassName,
  authTitleClassName,
} from "@/components/marketing-wow/marketing-auth-ui";

export const metadata = {
  title: "Accept invite | Hey Ralli",
  description:
    "Open the secure invite link from your PTA admin to join your Hey Ralli workspace.",
};

export default function InviteLandingPage() {
  return (
    <MarketingAuthCardShell>
      <MarketingAuthBackLink href="/signup/welcome" label="Back to welcome" />

      <h1 className={`${authTitleClassName} mt-4`}>Join your team</h1>
      <p className={`${authSubClassName} mb-8`}>
        Your president or admin sends a secure invite link by email. Open that
        link to set your password and join the workspace — no founding code
        needed.
      </p>
      <div className="rounded-2xl border border-cos-border bg-cos-bg-alt/40 px-4 py-4 text-sm leading-relaxed text-cos-muted">
        Don’t have the link yet? Ask your admin to resend it, or{" "}
        <Link href="/login" className="font-bold text-cos-text hover:underline">
          sign in
        </Link>{" "}
        if you already have an account.
      </div>
      <p className="mt-8 text-center text-sm text-cos-muted">
        Starting a new organization?{" "}
        <Link
          href="/signup/welcome?path=new"
          className="font-bold text-cos-text hover:underline"
        >
          Get started
        </Link>
      </p>
      <MarketingAuthLegalNote />
    </MarketingAuthCardShell>
  );
}
