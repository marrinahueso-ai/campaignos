import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { FeaturesCarousel } from "@/components/marketing/FeaturesCarousel";
import {
  StudioMarketingPageHeader,
  StudioMarketingShell,
} from "@/components/marketing/StudioMarketingShell";
import { Button } from "@/components/ui/Button";

interface StudioFeaturesPageProps {
  userEmail?: string | null;
}

export function StudioFeaturesPage({ userEmail = null }: StudioFeaturesPageProps) {
  const isSignedIn = Boolean(userEmail);

  return (
    <StudioMarketingShell userEmail={userEmail}>
      <section className="border-b border-cos-border bg-cos-dark">
        <div className="mx-auto max-w-7xl px-6 py-16 lg:px-10 lg:py-20">
          <StudioMarketingPageHeader
            tone="dark"
            eyebrow="Features"
            title="Everything your PTO needs — nothing you don't."
            description="Explore real workspace screens — dashboard, calendar heatmap, artwork studio, approvals, and Meta publishing. The tour cycles on its own, or pick a feature below."
          />
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-6 pt-12 pb-16 lg:px-10 lg:pt-16 lg:pb-24">
        <FeaturesCarousel />

        <section className="mt-20 border border-cos-border bg-cos-dark px-8 py-12 text-center sm:px-12">
          <p className="studio-eyebrow text-cos-dark-muted">Ready when you are</p>
          <h2 className="font-display mt-4 text-3xl text-[#f6f2eb] sm:text-4xl">
            See it with your own events.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-cos-dark-muted">
            Set up your school once, import your calendar, and run your first campaign
            in an afternoon — not a semester.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            {isSignedIn ? (
              <Button href="/dashboard" size="lg">
                Go to workspace
                <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
              </Button>
            ) : (
              <>
                <Button href="/login" size="lg">
                  Get started
                  <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
                </Button>
                <Link
                  href="/pricing"
                  className="text-sm tracking-wide text-cos-dark-muted transition-colors hover:text-[#f6f2eb]"
                >
                  View pricing
                </Link>
              </>
            )}
          </div>
        </section>
      </div>
    </StudioMarketingShell>
  );
}
