import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { CreateAIPublicDemo } from "@/components/marketing/features-in-action/CreateAIPublicDemo";
import { ProductStorySection } from "@/components/marketing/features-in-action/ProductStorySection";
import { StaticProductPreview } from "@/components/marketing/features-in-action/StaticProductPreview";
import { StudioMarketingShell } from "@/components/marketing/StudioMarketingShell";
import { Button } from "@/components/ui/Button";
import { ONBOARDING_PATH } from "@/lib/auth/post-auth-path";
import {
  FEATURES_CREATE_WITH_AI_STORY,
  FEATURES_IN_ACTION_FINAL_CTA,
  FEATURES_IN_ACTION_HERO,
  FEATURES_IN_ACTION_STATIC_SECTIONS,
} from "@/lib/marketing/features-in-action";

interface StudioFeaturesPageProps {
  userEmail?: string | null;
  workspaceHref?: string;
}

export function StudioFeaturesPage({
  userEmail = null,
  workspaceHref = "/dashboard",
}: StudioFeaturesPageProps) {
  const isSignedIn = Boolean(userEmail);
  const getStartedHref = isSignedIn
    ? workspaceHref
    : `/login?intent=setup&next=${encodeURIComponent(ONBOARDING_PATH)}`;
  const primaryCtaLabel = isSignedIn
    ? "Go to workspace"
    : FEATURES_IN_ACTION_HERO.primaryCta;

  return (
    <StudioMarketingShell userEmail={userEmail} workspaceHref={workspaceHref}>
      {/* Hero */}
      <section className="border-b border-cos-border bg-cos-bg">
        <div className="mx-auto max-w-7xl px-6 py-16 lg:px-10 lg:py-24">
          <p className="studio-eyebrow">{FEATURES_IN_ACTION_HERO.eyebrow}</p>
          <h1 className="font-display mt-4 max-w-4xl text-4xl leading-tight text-cos-text sm:text-5xl lg:text-6xl">
            {FEATURES_IN_ACTION_HERO.title}
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-cos-muted sm:text-lg">
            {FEATURES_IN_ACTION_HERO.description}
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Button href={getStartedHref} size="lg">
              {primaryCtaLabel}
              <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
            </Button>
            <Link
              href={`#${FEATURES_IN_ACTION_HERO.workflowAnchor}`}
              className="text-sm font-medium tracking-wide text-cos-text/80 underline-offset-4 transition-colors hover:text-cos-text hover:underline"
            >
              {FEATURES_IN_ACTION_HERO.secondaryCta}
            </Link>
          </div>
        </div>
      </section>

      {/* Create with AI — live Motion demo */}
      <ProductStorySection
        id={FEATURES_CREATE_WITH_AI_STORY.id}
        eyebrow={FEATURES_CREATE_WITH_AI_STORY.eyebrow}
        heading={FEATURES_CREATE_WITH_AI_STORY.heading}
        body={FEATURES_CREATE_WITH_AI_STORY.body}
        benefits={FEATURES_CREATE_WITH_AI_STORY.benefits}
        visual={<CreateAIPublicDemo />}
      />

      {/* Remaining product stories — static previews */}
      {FEATURES_IN_ACTION_STATIC_SECTIONS.map((section, index) => (
        <ProductStorySection
          key={section.id}
          id={section.id}
          eyebrow={section.eyebrow}
          heading={section.heading}
          body={section.body}
          benefits={section.benefits}
          reverse={index % 2 === 0}
          visual={
            <StaticProductPreview
              src={section.imageSrc}
              alt={section.imageAlt}
              label={section.eyebrow}
            />
          }
        />
      ))}

      {/* Final CTA */}
      <section className="bg-cos-bg px-6 py-16 lg:px-10 lg:py-24">
        <div className="mx-auto max-w-3xl border border-cos-border bg-cos-dark px-8 py-12 text-center sm:px-12">
          <p className="studio-eyebrow text-cos-dark-muted">
            {FEATURES_IN_ACTION_FINAL_CTA.eyebrow}
          </p>
          <h2 className="font-display mt-4 text-3xl text-[#f6f2eb] sm:text-4xl">
            {FEATURES_IN_ACTION_FINAL_CTA.title}
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-cos-dark-muted sm:text-base">
            {FEATURES_IN_ACTION_FINAL_CTA.body}
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Button href={getStartedHref} size="lg">
              {isSignedIn ? "Go to workspace" : FEATURES_IN_ACTION_FINAL_CTA.cta}
              <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
            </Button>
            {!isSignedIn ? (
              <Link
                href="/pricing"
                className="text-sm tracking-wide text-cos-dark-muted transition-colors hover:text-[#f6f2eb]"
              >
                View pricing
              </Link>
            ) : null}
          </div>
        </div>
      </section>
    </StudioMarketingShell>
  );
}
