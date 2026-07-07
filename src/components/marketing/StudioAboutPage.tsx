import Image from "next/image";
import { ArrowRight, Heart, Layers, Sparkles } from "lucide-react";
import {
  StudioMarketingPageHeader,
  StudioMarketingShell,
} from "@/components/marketing/StudioMarketingShell";
import { Button } from "@/components/ui/Button";

interface StudioAboutPageProps {
  userEmail?: string | null;
  workspaceHref?: string;
}

const milestones = [
  {
    icon: Sparkles,
    title: "The overwhelm was real",
    body: "Flyers in one folder. Captions in another. Facebook here, Instagram there. Every event meant late nights, duplicated work, and the constant worry that something important would slip through.",
  },
  {
    icon: Heart,
    title: "Built for volunteers, not agencies",
    body: "Hey Ralli started with a simple belief: PTO leaders are not full-time marketers. You're moms, dads, and neighbors giving your time between carpools, work, and everything else on your plate.",
  },
  {
    icon: Layers,
    title: "One calm studio for the whole year",
    body: "We brought planning, artwork, captions, approvals, and publishing into one warm workspace — so your team can focus on the school community, not the software.",
  },
];

export function StudioAboutPage({
  userEmail = null,
  workspaceHref = "/dashboard",
}: StudioAboutPageProps) {
  const isSignedIn = Boolean(userEmail);

  return (
    <StudioMarketingShell userEmail={userEmail} workspaceHref={workspaceHref}>
      <div className="mx-auto max-w-7xl px-6 py-16 lg:px-10 lg:py-24">
        <StudioMarketingPageHeader
          eyebrow="Our story"
          title="Born from late nights and good intentions."
          description="Hey Ralli exists because school communication shouldn't require a marketing degree — or a second job."
        />

        <section className="mt-16 grid overflow-hidden border border-cos-border lg:grid-cols-2">
          <div className="order-2 flex flex-col justify-center bg-cos-card px-8 py-10 lg:order-1 lg:px-12 lg:py-14">
            <p className="studio-eyebrow">Who we are</p>
            <h2 className="font-display mt-4 text-3xl leading-tight text-cos-text sm:text-4xl">
              Parents first. Volunteers always.
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-cos-muted sm:text-base">
              We&apos;re a family that said yes to helping at school — and quickly
              learned how heavy social media work can be on top of everything else.
              Hey Ralli is the tool we wished existed: one calm place to plan,
              create, and publish so you can get back to what matters most.
            </p>
          </div>

          <div className="relative order-1 min-h-[300px] sm:min-h-[360px] lg:order-2 lg:min-h-[440px]">
            <Image
              src="/images/about-family.png"
              alt="The family behind Hey Ralli"
              fill
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover object-[center_30%]"
              priority
            />
            <div
              className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#f6f2eb]/80 via-transparent to-transparent lg:bg-gradient-to-l lg:from-[#f6f2eb]/70 lg:via-transparent lg:to-transparent"
              aria-hidden
            />
          </div>
        </section>

        <div className="mt-16 grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:gap-20">
          <div className="space-y-6 text-base leading-relaxed text-cos-muted">
            <p>
              It started the way a lot of PTO stories do: someone volunteered to
              &ldquo;just handle social media&rdquo; for the next event. What looked like a
              small favor quickly became a mountain of tasks — designing graphics,
              writing captions, getting approvals, posting at the right time, and
              doing it all over again for the next fundraiser, book fair, or spirit night.
            </p>
            <p>
              The work was important. Families needed to know what was happening.
              But the process was fragmented, stressful, and far too heavy for
              volunteers who were already giving their best hours to their schools.
            </p>
            <p>
              We asked a different question: what if everything lived in one place?
              What if a busy mom or dad could open a single studio, see the whole
              campaign at a glance, create artwork once, approve captions with
              confidence, and publish without juggling five different apps?
            </p>
            <p className="text-cos-text">
              That question became Hey Ralli — a design-forward workspace built
              for school teams who care deeply, move fast, and deserve tools that
              respect how limited their time really is.
            </p>
          </div>

          <aside className="border border-cos-border bg-cos-card p-8 lg:p-10">
            <p className="studio-eyebrow">What we believe</p>
            <ul className="mt-6 space-y-5">
              {[
                "Volunteers deserve clarity, not chaos.",
                "Beautiful communications shouldn't require a design team.",
                "Your school's voice should feel personal — never corporate.",
                "One workspace beats ten open tabs every time.",
              ].map((item) => (
                <li key={item} className="flex gap-3 text-sm leading-relaxed text-cos-text">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-cos-accent" />
                  {item}
                </li>
              ))}
            </ul>
          </aside>
        </div>

        <ul className="mt-20 grid gap-8 border-t border-cos-border pt-16 lg:grid-cols-3">
          {milestones.map(({ icon: Icon, title, body }) => (
            <li key={title} className="space-y-4">
              <div className="flex h-10 w-10 items-center justify-center border border-cos-border bg-cos-card">
                <Icon className="h-4 w-4 text-cos-accent" strokeWidth={1.5} />
              </div>
              <h2 className="font-display text-2xl text-cos-text">{title}</h2>
              <p className="text-sm leading-relaxed text-cos-muted">{body}</p>
            </li>
          ))}
        </ul>

        <div className="mt-20 border border-cos-dark bg-cos-dark px-8 py-12 text-center lg:px-16">
          <p className="studio-eyebrow text-cos-dark-muted">Ready when you are</p>
          <h2 className="font-display mt-4 text-3xl text-[#f6f2eb] sm:text-4xl">
            Your school deserves a calmer way to communicate.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-cos-dark-muted">
            Join the volunteers and PTO leaders who are trading scattered tools for
            one beautiful studio.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button href={isSignedIn ? workspaceHref : "/login"} size="lg">
              {isSignedIn ? "Go to workspace" : "Get started"}
              <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
            </Button>
            <Button href="/pricing" size="lg" variant="secondary" className="border-cos-dark-muted/30 bg-transparent text-[#f6f2eb] hover:bg-white/10">
              View pricing
            </Button>
          </div>
        </div>
      </div>
    </StudioMarketingShell>
  );
}
