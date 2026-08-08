import type { Metadata } from "next";
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
import { ONBOARDING_PATH } from "@/lib/auth/post-auth-path-shared";

export const metadata: Metadata = {
  title: "Welcome | Hey Ralli",
  description: "Choose how you are joining Hey Ralli.",
};

const CHOICES = [
  {
    id: "new",
    eyebrow: "Leader",
    title: "Start a new school",
    description:
      "Create your school’s Hey Ralli workspace and start your 14-day trial.",
    href: (next: string) =>
      `/signup${next ? `?next=${encodeURIComponent(next)}` : ""}`,
  },
  {
    id: "join",
    eyebrow: "Volunteer",
    title: "Join my team",
    description:
      "Accept your invitation and step into your team’s workspace.",
    href: () => "/invite",
  },
  {
    id: "founding",
    eyebrow: "Partner",
    title: "I have a founding school code",
    description: "Activate Founding School access provided by Hey Ralli.",
    href: (next: string) => {
      const qs = new URLSearchParams({ plan: "premium", founding: "1" });
      if (next) qs.set("next", next);
      return `/signup?${qs}`;
    },
  },
] as const;

export default async function SignupWelcomePage({
  searchParams,
}: {
  searchParams: Promise<{ path?: string; next?: string }>;
}) {
  const params = await searchParams;
  const next = params.next?.trim() || ONBOARDING_PATH;
  const preferred = params.path?.trim().toLowerCase();

  return (
    <MarketingAuthCardShell maxWidthClassName="max-w-[480px]">
      <MarketingAuthBackLink href="/get-started" label="Back to Get Started" />

      <div className="pt-2 text-center">
        <h1 className={authTitleClassName}>Welcome to Hey Ralli.</h1>
        <p className={authSubClassName}>How are you joining?</p>
      </div>

      <div className="mt-8 space-y-3">
        {CHOICES.map((choice) => {
          const href =
            choice.id === "join" ? choice.href() : choice.href(next);
          const highlight =
            preferred === choice.id ||
            (preferred === "new" && choice.id === "new");

          return (
            <Link
              key={choice.id}
              href={href}
              className={`block rounded-2xl border px-5 py-5 text-left transition-colors ${
                highlight
                  ? "border-cos-brand-sage bg-cos-brand-sage-soft/40"
                  : "border-cos-border bg-cos-card hover:border-cos-brand-sage/50 hover:bg-cos-bg-alt/40"
              }`}
            >
              <p className="text-[10px] font-bold tracking-[0.2em] text-cos-muted uppercase">
                {choice.eyebrow}
              </p>
              <p className="mt-1.5 text-sm font-bold tracking-wide text-cos-text uppercase">
                {choice.title}
              </p>
              <p className="mt-1.5 text-sm leading-relaxed text-cos-muted">
                {choice.description}
              </p>
            </Link>
          );
        })}
      </div>

      <p className="mt-8 text-center text-sm text-cos-muted">
        Already have an account?{" "}
        <Link href="/login" className="font-bold text-cos-text hover:underline">
          Log in
        </Link>
      </p>

      <MarketingAuthLegalNote />
    </MarketingAuthCardShell>
  );
}
