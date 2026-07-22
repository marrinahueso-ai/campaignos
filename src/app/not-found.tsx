import type { Metadata } from "next";
import { NotFoundGoBackLink } from "@/components/brand/NotFoundGoBackLink";
import { WanderingSpeechBubble } from "@/components/brand/WanderingSpeechBubble";
import { Button } from "@/components/ui/Button";

export const metadata: Metadata = {
  title: "Page not found",
};

export default function NotFound() {
  return (
    <main className="relative min-h-full overflow-x-clip bg-cos-bg px-6 py-16 sm:px-8 sm:py-20">
      {/* Full-bleed walk layer — character exits past the right edge */}
      <div className="pointer-events-none absolute inset-y-0 right-0 left-[42%] hidden overflow-visible lg:block">
        <WanderingSpeechBubble className="h-full max-w-none" />
      </div>

      <div className="relative z-10 mx-auto grid w-full max-w-5xl items-center gap-10 lg:grid-cols-2 lg:gap-12">
        <div className="space-y-6 text-center lg:text-left">
          <p className="font-display text-6xl text-cos-brand-navy sm:text-7xl">
            404
          </p>
          <div className="space-y-3">
            <h1 className="font-display text-3xl text-cos-text sm:text-4xl">
              Looks like this page wandered off.
            </h1>
            <p className="mx-auto max-w-md text-base leading-relaxed text-cos-muted lg:mx-0">
              We couldn’t find the page you were looking for.
              <br />
              Let’s get you back to the right place.
            </p>
          </div>

          <div className="flex flex-col items-stretch gap-3 sm:mx-auto sm:max-w-xs lg:mx-0">
            <Button href="/dashboard" size="lg">
              Go to Dashboard
            </Button>
            <Button href="/events" variant="secondary" size="lg">
              View Events
            </Button>
          </div>

          <div className="pt-1">
            <NotFoundGoBackLink />
          </div>
        </div>

        {/* Mobile / tablet: walk in the stacked illustration slot */}
        <div className="min-h-[min(48vh,20rem)] lg:hidden">
          <WanderingSpeechBubble />
        </div>
      </div>
    </main>
  );
}
