import { cn } from "@/lib/utils/cn";
import { Lock } from "lucide-react";
import Link from "next/link";

type CreateWithAiLandingProps = {
  organizationName: string | null;
  canUseSocial: boolean;
  socialHref: string;
};

function WebsitePagesArt() {
  return (
    <div className="cwai-art cwai-art-home relative h-[11.5rem] overflow-hidden rounded-[20px]">
      <div className="absolute inset-0 bg-[linear-gradient(145deg,#2f4a3c_0%,#6b8171_48%,#b8c9bc_100%)]" />
      <div className="cwai-drift absolute -right-8 -top-10 h-36 w-36 rounded-full bg-[#f6f2eb]/20 blur-2xl" />
      <div className="cwai-drift-slow absolute -bottom-10 left-6 h-28 w-28 rounded-full bg-[#d4a84b]/25 blur-2xl" />

      {/* Mini page library */}
      <div className="cwai-stage absolute inset-x-4 top-5 bottom-4 grid grid-cols-2 gap-1.5">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="cwai-tile rounded-[10px] border border-white/30 bg-[#fffcf7]/92 p-1.5 shadow-[0_8px_18px_rgba(28,36,48,0.14)]"
            style={{ animationDelay: `${i * 100}ms` }}
          >
            <div
              className="mb-1 h-5 rounded-[6px]"
              style={{
                background:
                  i === 0
                    ? "linear-gradient(120deg,#0b2f5b,#2f9fb3)"
                    : i === 1
                      ? "linear-gradient(120deg,#1a4a6e,#2a7a86)"
                      : i === 2
                        ? "linear-gradient(120deg,#c4922e,#e0b65a)"
                        : "linear-gradient(145deg,#ebe4d9,#f6f2eb)",
              }}
            />
            <div className="h-1 w-[70%] rounded-full bg-[#ebe4d9]" />
            <div className="mt-1 h-1 w-[45%] rounded-full bg-[#d9e8ec]" />
          </div>
        ))}
      </div>
    </div>
  );
}

function SocialArt() {
  return (
    <div className="cwai-art cwai-art-social relative h-[11.5rem] overflow-hidden rounded-[20px]">
      <div className="absolute inset-0 bg-[linear-gradient(155deg,#c4922e_0%,#e0b65a_42%,#f5e6c2_100%)]" />
      <div className="cwai-drift absolute -left-6 top-0 h-32 w-32 rounded-full bg-white/30 blur-2xl" />
      <div className="cwai-drift-slow absolute -bottom-8 right-0 h-28 w-28 rounded-full bg-[#2a2622]/10 blur-2xl" />

      {/* Stacked posts */}
      <div className="cwai-stage absolute inset-0 flex items-center justify-center">
        <div className="relative h-[7.25rem] w-[7.25rem]">
          <div className="absolute left-2 top-3 h-[6.1rem] w-[6.1rem] rotate-[-8deg] rounded-[16px] bg-white/55 shadow-md ring-1 ring-black/5" />
          <div className="absolute left-4 top-2 h-[6.1rem] w-[6.1rem] rotate-[6deg] rounded-[16px] bg-white/70 shadow-md ring-1 ring-black/5" />
          <div className="cwai-post absolute left-3 top-1 h-[6.4rem] w-[6.4rem] rounded-[18px] bg-[#fffcf7] p-2 shadow-[0_14px_30px_rgba(42,38,34,0.18)] ring-1 ring-black/5">
            <div className="h-full rounded-[12px] bg-[linear-gradient(145deg,#2f4a3c,#6b8171_55%,#d4a84b)]" />
          </div>
        </div>
      </div>
    </div>
  );
}

function NewsletterArt() {
  return (
    <div className="cwai-art cwai-art-news relative h-[11.5rem] overflow-hidden rounded-[20px]">
      <div className="absolute inset-0 bg-[linear-gradient(155deg,#0b2f5b_0%,#2f9fb3_48%,#7fd0df_100%)]" />
      <div className="cwai-drift absolute -left-8 top-2 h-32 w-32 rounded-full bg-[#f7c948]/35 blur-2xl" />
      <div className="cwai-drift-slow absolute -bottom-10 -right-4 h-28 w-28 rounded-full bg-white/25 blur-2xl" />

      {/* Stacked Scoop email */}
      <div className="cwai-stage absolute inset-0 flex items-center justify-center">
        <div className="relative h-[7.5rem] w-[7.75rem]">
          <div className="absolute left-1 top-3 h-[6.4rem] w-[6.6rem] rotate-[-7deg] rounded-[16px] bg-white/40 shadow-md ring-1 ring-white/30" />
          <div className="absolute left-3 top-2 h-[6.4rem] w-[6.6rem] rotate-[5deg] rounded-[16px] bg-white/55 shadow-md ring-1 ring-white/40" />
          <div className="cwai-post absolute left-2 top-1 h-[6.7rem] w-[6.9rem] rounded-[18px] bg-[#fffcf7] p-2 shadow-[0_14px_30px_rgba(11,47,91,0.28)] ring-1 ring-black/5">
            <div className="h-4 overflow-hidden rounded-[8px] bg-[linear-gradient(120deg,#0b2f5b,#2f9fb3)] px-1.5 py-1">
              <div className="h-1 w-10 rounded-full bg-white/80" />
            </div>
            <div className="mt-1.5 rounded-[6px] bg-[#fff9e8] px-1.5 py-1 ring-1 ring-[#f7c948]/50">
              <div className="h-1 w-full rounded-full bg-[#e8c96a]/80" />
              <div className="mt-1 h-1 w-[70%] rounded-full bg-[#e8c96a]/45" />
            </div>
            <div className="mt-1.5 flex items-start gap-1.5">
              <div className="h-7 w-7 shrink-0 rounded-[7px] bg-[linear-gradient(145deg,#2f4a3c,#d4a84b)]" />
              <div className="min-w-0 flex-1 space-y-1 pt-0.5">
                <div className="h-1.5 w-[90%] rounded-full bg-[#d9e8ec]" />
                <div className="h-1 w-[65%] rounded-full bg-[#ebe4d9]" />
              </div>
            </div>
            <div className="mt-1.5 flex gap-1">
              <div className="h-2.5 flex-1 rounded-full bg-[#eef8fa] ring-1 ring-[#c5e4ea]" />
              <div className="h-2.5 flex-1 rounded-full bg-[#f0faf7] ring-1 ring-[#c5e4ea]" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const CHOICES = [
  {
    id: "website-pages" as const,
    title: "Website pages",
    description:
      "Homepage, Volunteer, and more website page templates — edit, preview, and export full pages.",
    cta: "Open pages library →",
    href: "/create-with-ai/website-pages",
    Art: WebsitePagesArt,
    enabled: true as const,
  },
  {
    id: "social" as const,
    title: "Social Media",
    description:
      "Campaign posts from your events — inspiration, square artwork, captions, and approvals.",
    cta: "Open Social →",
    href: "/create-with-ai/social",
    Art: SocialArt,
    enabled: true as const,
  },
  {
    id: "newsletter" as const,
    title: "Newsletter",
    description:
      "Scoop-style family email from your events — message, stories, calendar, sponsors, and socials.",
    cta: "Start Newsletter Composer →",
    href: "/newsletter-composer",
    Art: NewsletterArt,
    enabled: true as const,
  },
];

export function CreateWithAiLanding({
  organizationName,
  canUseSocial,
  socialHref,
}: CreateWithAiLandingProps) {
  return (
    <div className="studio-page relative space-y-8 pb-12">
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
        @keyframes cwai-tile {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-3px); }
        }
        .cwai-card-enter {
          animation: cwai-fade-up 0.55s ease both;
        }
        .cwai-drift { animation: cwai-drift 7s ease-in-out infinite; }
        .cwai-drift-slow { animation: cwai-drift-slow 9s ease-in-out infinite; }
        .cwai-tile { animation: cwai-tile 3.6s ease-in-out infinite; }
        .cwai-choice:hover .cwai-stage {
          transform: translateY(-3px) scale(1.03);
        }
        .cwai-stage {
          transition: transform 0.35s cubic-bezier(0.22, 1, 0.36, 1);
        }
        .cwai-choice:hover .cwai-post {
          transform: rotate(-2deg) scale(1.04);
        }
        .cwai-post {
          transition: transform 0.35s cubic-bezier(0.22, 1, 0.36, 1);
        }
        @media (prefers-reduced-motion: reduce) {
          .cwai-card-enter, .cwai-drift, .cwai-drift-slow, .cwai-tile {
            animation: none !important;
          }
          .cwai-choice:hover .cwai-stage,
          .cwai-choice:hover .cwai-post {
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

      <header className="relative max-w-2xl space-y-3">
        <p className="studio-eyebrow">Create with AI</p>
        <h1 className="font-display text-4xl text-cos-text sm:text-5xl">
          Create with AI
        </h1>
        <p className="text-sm leading-relaxed text-cos-muted sm:text-base">
          Pick what you want to make
          {organizationName ? ` for ${organizationName}` : ""} — website
          pages, social, or newsletter.
        </p>
      </header>

      <div className="relative grid gap-5 md:grid-cols-3">
        {CHOICES.map((choice, index) => {
          const isSocial = choice.id === "social";
          const lockedSocial = isSocial && !canUseSocial;
          const href = isSocial ? socialHref : choice.href;
          const enabled = choice.enabled && !lockedSocial;

          const body = (
            <>
              <choice.Art />
              <div className="mt-5 flex flex-1 flex-col px-1">
                {!choice.enabled ? (
                  <span className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-cos-muted">
                    Coming later
                  </span>
                ) : null}
                {lockedSocial ? (
                  <span className="mb-2 inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-cos-muted">
                    <Lock className="h-3 w-3" strokeWidth={1.75} />
                    Access needed
                  </span>
                ) : null}
                <h2 className="font-display text-2xl text-cos-text sm:text-[1.7rem]">
                  {choice.title}
                </h2>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-cos-muted">
                  {lockedSocial
                    ? "Ask an admin for artwork / campaign create access to open Social."
                    : choice.description}
                </p>
                <p
                  className={cn(
                    "mt-5 text-sm font-semibold transition-colors",
                    enabled ? "text-cos-brand-sage" : "text-cos-muted",
                  )}
                >
                  {lockedSocial ? "Need permission" : choice.cta}
                </p>
              </div>
            </>
          );

          const cardClass = cn(
            "cwai-card-enter cwai-choice group flex h-full flex-col rounded-[26px] border border-cos-border/80 bg-cos-card/95 p-3.5 text-left shadow-[0_10px_32px_rgba(42,38,34,0.06)] backdrop-blur-sm transition-[transform,box-shadow,border-color] duration-300",
            enabled &&
              "hover:-translate-y-1 hover:border-cos-brand-sage/50 hover:shadow-[0_18px_40px_rgba(42,38,34,0.1)]",
            !enabled && "cursor-not-allowed opacity-80",
          );

          const style = { animationDelay: `${index * 90}ms` };

          if (enabled && href) {
            return (
              <Link
                key={choice.id}
                href={href}
                className={cardClass}
                style={style}
              >
                {body}
              </Link>
            );
          }

          return (
            <div
              key={choice.id}
              className={cardClass}
              style={style}
              aria-disabled
            >
              {body}
            </div>
          );
        })}
      </div>
    </div>
  );
}
