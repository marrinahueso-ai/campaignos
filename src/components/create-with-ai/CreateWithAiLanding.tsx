import { cn } from "@/lib/utils/cn";
import { Lock } from "lucide-react";
import Link from "next/link";

type CreateWithAiLandingProps = {
  canUseSocial: boolean;
  socialHref: string;
};

function SocialHeroArt() {
  return (
    <div className="cwai-art relative flex min-h-[7.5rem] w-full items-center justify-center overflow-hidden bg-[linear-gradient(155deg,#c4922e_0%,#e0b65a_42%,#f5e6c2_100%)] sm:min-h-[8.25rem]">
      <div className="cwai-drift absolute -left-6 top-0 h-28 w-28 rounded-full bg-white/30 blur-2xl" />
      <div className="cwai-drift-slow absolute -bottom-8 right-0 h-24 w-24 rounded-full bg-[#2a2622]/10 blur-2xl" />
      <div className="cwai-stage relative h-[6.25rem] w-[6.25rem]">
        <div className="absolute left-2 top-3 h-[5.2rem] w-[5.2rem] rotate-[-8deg] rounded-[14px] bg-white/55 shadow-md ring-1 ring-black/5" />
        <div className="absolute left-3.5 top-2 h-[5.2rem] w-[5.2rem] rotate-[6deg] rounded-[14px] bg-white/70 shadow-md ring-1 ring-black/5" />
        <div className="cwai-post absolute left-2.5 top-1 h-[5.5rem] w-[5.5rem] rounded-[16px] bg-[#fffcf7] p-1.5 shadow-[0_14px_30px_rgba(42,38,34,0.18)] ring-1 ring-black/5">
          <div className="h-full rounded-[11px] bg-[linear-gradient(145deg,#2f4a3c,#6b8171_55%,#d4a84b)]" />
        </div>
      </div>
    </div>
  );
}

function FlyerHeroArt() {
  return (
    <div className="cwai-art relative flex min-h-[7.5rem] w-full items-center justify-center overflow-hidden bg-[linear-gradient(155deg,#2f4a3c_0%,#6b8171_48%,#d4a84b_100%)] sm:min-h-[8.25rem]">
      <div className="cwai-drift absolute -right-4 top-2 h-28 w-28 rounded-full bg-white/20 blur-2xl" />
      <div className="cwai-drift-slow absolute -bottom-10 -left-4 h-24 w-24 rounded-full bg-[#2a2622]/15 blur-2xl" />
      <div className="cwai-stage relative flex h-[6.5rem] w-[5rem] items-center justify-center">
        <div className="absolute inset-x-0 top-1 h-[5.8rem] rotate-[-4deg] rounded-[6px] bg-white/40 shadow-md" />
        <div className="cwai-post relative h-[5.9rem] w-[4.35rem] rounded-[7px] bg-[#fffcf7] p-1.5 shadow-[0_14px_30px_rgba(42,38,34,0.2)] ring-1 ring-black/5">
          <div className="flex h-full flex-col gap-1 rounded-[4px] bg-[linear-gradient(180deg,#f6f2eb,#ebe4d9)] p-1.5">
            <div className="h-2 w-3/4 rounded-sm bg-[#2f4a3c]/35" />
            <div className="h-1.5 w-full rounded-sm bg-[#2a2622]/12" />
            <div className="mt-auto h-5 w-full rounded-sm bg-[linear-gradient(135deg,#c4922e,#e0b65a)]" />
          </div>
        </div>
      </div>
    </div>
  );
}

function MiniArt({
  className,
}: {
  className: string;
}) {
  return (
    <div
      className={cn("mb-2.5 h-14 w-full rounded-xl", className)}
      aria-hidden
    />
  );
}

type AlsoItem = {
  id: string;
  title: string;
  href: string | null;
  artClass: string;
  status: "live" | "soon";
};

const ALSO_AVAILABLE: AlsoItem[] = [
  {
    id: "homepage",
    title: "Homepage",
    href: "/homepage-composer",
    artClass: "bg-[linear-gradient(145deg,#2f4a3c,#6b8171_50%,#b8c9bc)]",
    status: "live",
  },
  {
    id: "volunteer",
    title: "Volunteer page",
    href: "/volunteer-composer",
    artClass: "bg-[linear-gradient(145deg,#1a4a6e,#2a7a86_55%,#a8d4dc)]",
    status: "live",
  },
  {
    id: "newsletter",
    title: "Newsletter",
    href: "/newsletter-composer",
    artClass: "bg-[linear-gradient(155deg,#0b2f5b,#2f9fb3_50%,#7fd0df)]",
    status: "live",
  },
  {
    id: "sponsorship",
    title: "Sponsorship",
    href: null,
    artClass: "bg-[linear-gradient(145deg,#5c4030,#c4922e_60%,#f0e0c0)]",
    status: "soon",
  },
];

const FLYER_HREF = "/create-with-ai/flyer?view=start";

export function CreateWithAiLanding({
  canUseSocial,
  socialHref,
}: CreateWithAiLandingProps) {
  const socialLocked = !canUseSocial;

  return (
    <div className="relative mx-auto w-full max-w-2xl space-y-7 px-1 pb-12">
      <style>{`
        @keyframes cwai-fade-up {
          from { opacity: 0; transform: translateY(14px); }
          to { opacity: 1; transform: none; }
        }
        @keyframes cwai-drift {
          0%, 100% { transform: translate3d(0, 0, 0); }
          50% { transform: translate3d(8px, -6px, 0); }
        }
        @keyframes cwai-drift-slow {
          0%, 100% { transform: translate3d(0, 0, 0); }
          50% { transform: translate3d(-6px, 8px, 0); }
        }
        .cwai-card-enter {
          animation: cwai-fade-up 0.55s ease both;
        }
        .cwai-drift { animation: cwai-drift 7s ease-in-out infinite; }
        .cwai-drift-slow { animation: cwai-drift-slow 9s ease-in-out infinite; }
        .cwai-hero:hover .cwai-stage {
          transform: translateY(-3px) scale(1.03);
        }
        .cwai-stage {
          transition: transform 0.35s cubic-bezier(0.22, 1, 0.36, 1);
        }
        .cwai-hero:hover .cwai-post {
          transform: rotate(-2deg) scale(1.04);
        }
        .cwai-post {
          transition: transform 0.35s cubic-bezier(0.22, 1, 0.36, 1);
        }
        @media (prefers-reduced-motion: reduce) {
          .cwai-card-enter, .cwai-drift, .cwai-drift-slow {
            animation: none !important;
          }
          .cwai-hero:hover .cwai-stage,
          .cwai-hero:hover .cwai-post {
            transform: none;
          }
        }
      `}</style>

      <div
        aria-hidden
        className="pointer-events-none absolute -left-10 top-0 h-56 w-56 rounded-full bg-cos-brand-sage/10 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-8 top-16 h-48 w-48 rounded-full bg-cos-brand-mustard/15 blur-3xl"
      />

      <header className="relative space-y-2">
        <p className="studio-eyebrow">Create with AI</p>
        <h1 className="font-display text-3xl tracking-[-0.02em] text-cos-text sm:text-4xl">
          Posts and print flyers
        </h1>
      </header>

      <section className="relative space-y-3" aria-labelledby="cwai-start-here">
        <p
          id="cwai-start-here"
          className="text-[11px] font-extrabold uppercase tracking-[0.07em] text-cos-brand-mustard"
        >
          Start here
        </p>

        <div className="grid gap-3 sm:grid-cols-2">
          {socialLocked ? (
            <div
              className="cwai-card-enter cwai-hero flex flex-col overflow-hidden rounded-[22px] border border-cos-border/80 bg-cos-card/95 text-left shadow-[0_18px_40px_rgba(28,36,48,0.08)] opacity-90"
              aria-disabled
            >
              <div className="flex flex-1 flex-col justify-center px-5 py-5">
                <span className="mb-2 inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-cos-muted">
                  <Lock className="h-3 w-3" strokeWidth={1.75} />
                  Access needed
                </span>
                <h2 className="font-display text-xl text-cos-text">
                  Social Media
                </h2>
                <span className="mt-4 inline-flex self-start rounded-full bg-cos-bg-alt px-4 py-2 text-sm font-bold text-cos-muted">
                  Need permission
                </span>
              </div>
              <SocialHeroArt />
            </div>
          ) : (
            <Link
              href={socialHref}
              className="cwai-card-enter cwai-hero group flex flex-col overflow-hidden rounded-[22px] border border-cos-border/80 bg-cos-card/95 text-left shadow-[0_18px_40px_rgba(28,36,48,0.08)] transition-[transform,box-shadow] duration-300 hover:-translate-y-0.5 hover:shadow-[0_22px_48px_rgba(28,36,48,0.12)]"
            >
              <div className="flex flex-1 flex-col justify-center px-5 py-5">
                <h2 className="font-display text-xl text-cos-text">
                  Social Media
                </h2>
                <p className="mt-1.5 text-sm leading-snug text-cos-muted">
                  Feed and story posts for an event.
                </p>
                <span className="mt-4 inline-flex self-start rounded-full bg-cos-brand-sage px-4 py-2 text-sm font-bold text-[#fffcf7]">
                  Create social posts →
                </span>
              </div>
              <SocialHeroArt />
            </Link>
          )}

          <Link
            href={FLYER_HREF}
            className="cwai-card-enter cwai-hero group flex flex-col overflow-hidden rounded-[22px] border border-cos-border/80 bg-cos-card/95 text-left shadow-[0_18px_40px_rgba(28,36,48,0.08)] transition-[transform,box-shadow] duration-300 hover:-translate-y-0.5 hover:shadow-[0_22px_48px_rgba(28,36,48,0.12)]"
            style={{ animationDelay: "60ms" }}
          >
            <div className="flex flex-1 flex-col justify-center px-5 py-5">
              <h2 className="font-display text-xl text-cos-text">Flyer</h2>
              <p className="mt-1.5 text-sm leading-snug text-cos-muted">
                Print flyer for hallways, backpacks, and events.
              </p>
              <span className="mt-4 inline-flex self-start rounded-full bg-cos-brand-sage px-4 py-2 text-sm font-bold text-[#fffcf7]">
                Create a flyer →
              </span>
            </div>
            <FlyerHeroArt />
          </Link>
        </div>
      </section>

      <section className="relative space-y-3" aria-labelledby="cwai-also">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2
            id="cwai-also"
            className="text-[11px] font-extrabold uppercase tracking-[0.07em] text-cos-muted"
          >
            Also available
          </h2>
          <Link
            href="/newsletters"
            className="text-[11px] font-bold uppercase tracking-[0.07em] text-cos-brand-sage transition hover:text-cos-text"
          >
            Your newsletters →
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {ALSO_AVAILABLE.map((item, index) => {
            const live = item.status === "live" && item.href;
            const body = (
              <>
                <MiniArt className={item.artClass} />
                <h3 className="text-[13px] font-bold leading-snug text-cos-text">
                  {item.title}
                </h3>
                <span
                  className={cn(
                    "mt-auto inline-flex self-start rounded-full px-2 py-0.5 text-[10px] font-bold",
                    live
                      ? "bg-cos-brand-sage/15 text-cos-brand-sage"
                      : "bg-cos-bg-alt text-cos-muted",
                  )}
                >
                  {live ? "Open" : "Coming soon"}
                </span>
              </>
            );

            const cardClass = cn(
              "cwai-card-enter flex min-h-[108px] flex-col rounded-2xl border border-cos-border/80 bg-cos-card/90 p-3 text-left",
              live &&
                "transition-[border-color,transform] hover:-translate-y-0.5 hover:border-cos-brand-sage/40",
              !live && "cursor-default opacity-75",
            );
            const style = { animationDelay: `${140 + index * 50}ms` };

            if (live && item.href) {
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  className={cardClass}
                  style={style}
                >
                  {body}
                </Link>
              );
            }

            return (
              <div
                key={item.id}
                className={cardClass}
                style={style}
                aria-disabled
              >
                {body}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
