import { redirect } from "next/navigation";

export const metadata = {
  title: "Invite your team",
};

/** Legacy invite route — Ease page 3 combines Team + Meta at `/onboarding/connect`. */
export default function OnboardingInvitePage() {
  redirect("/onboarding/connect");
}
