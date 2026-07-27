import { redirect } from "next/navigation";

export const metadata = {
  title: "Connect Meta",
};

/** Legacy meta route — Ease page 3 combines Team + Meta at `/onboarding/connect`. */
export default function OnboardingMetaPage() {
  redirect("/onboarding/connect");
}
