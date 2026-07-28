import { cn } from "@/lib/utils/cn";
import Link from "next/link";

type WebsitePagesLandingProps = {
  organizationName: string | null;
};

function HomepageArt() {
  return (
    <div className="cwai-art relative h-[9.5rem] overflow-hidden rounded-[18px]">
      <div className="absolute inset-0 bg-[linear-gradient(145deg,#2f4a3c_0%,#6b8171_48%,#b8c9bc_100%)]" />
      <div className="cwai-drift absolute -right-8 -top-10 h-28 w-28 rounded-full bg-[#f6f2eb]/20 blur-2xl" />
      <div className="absolute inset-x-5 top-4 bottom-3 rounded-[12px] bg-[#fffcf7]/95 p-2 shadow-[0_10px_24px_rgba(28,36,48,0.16)] ring-1 ring-white/50">
        <div className="h-7 overflow-hidden rounded-[8px] bg-[linear-gradient(120deg,#0b2f5b,#2f9fb3)] px-2.5 py-1">
          <div className="h-1.5 w-14 rounded-full bg-white/70" />
          <div className="mt-1 h-1 w-20 rounded-full bg-white/40" />
        </div>
        <div className="mt-1.5 grid grid-cols-3 gap-1">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="aspect-square rounded-[6px] border border-[#d9e8ec] bg-white"
              style={{
                background:
                  i === 0
                    ? "linear-gradient(145deg,#f7c948,#ffe08a)"
                    : i === 1
                      ? "linear-gradient(145deg,#2f9fb3,#7fd0df)"
                      : "linear-gradient(145deg,#6b8171,#a8bfb0)",
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function VolunteerArt() {
  return (
    <div className="cwai-art relative h-[9.5rem] overflow-hidden rounded-[18px]">
      <div className="absolute inset-0 bg-[linear-gradient(155deg,#1a4a6e_0%,#2a7a86_45%,#6b8171_100%)]" />
      <div className="cwai-drift-slow absolute -left-6 bottom-0 h-24 w-24 rounded-full bg-[#f7c948]/25 blur-2xl" />
      <div className="absolute inset-x-5 top-4 bottom-3 grid grid-cols-2 gap-1.5">
        {["Open", "Open", "Soon", "Soon"].map((label, i) => (
          <div
            key={`${label}-${i}`}
            className="rounded-[10px] border border-white/25 bg-[#fffcf7]/92 p-1.5 shadow-sm"
          >
            <div
              className={cn(
                "text-[8px] font-bold",
                label === "Open" ? "text-[#2f4a3c]" : "text-[#7a7166]",
              )}
            >
              ● {label === "Open" ? "Open" : "Soon"}
            </div>
            <div className="mt-1 h-1.5 w-[70%] rounded-full bg-[#ebe4d9]" />
            <div className="mt-1 h-1 w-[45%] rounded-full bg-[#d9e8ec]" />
          </div>
        ))}
      </div>
    </div>
  );
}

function SponsorshipArt() {
  return (
    <div className="cwai-art relative h-[9.5rem] overflow-hidden rounded-[18px] opacity-90">
      <div className="absolute inset-0 bg-[linear-gradient(160deg,#ebe4d9,#f6f2eb_55%,#e8f0ec)]" />
      <div className="absolute inset-x-6 top-5 bottom-4 rounded-[12px] border border-dashed border-[rgba(47,74,60,0.28)] bg-white/70 p-3">
        <div className="h-2 w-20 rounded-full bg-[#d4a84b]/50" />
        <div className="mt-3 space-y-2">
          <div className="h-8 rounded-[8px] bg-[#f6f2eb]" />
          <div className="h-8 rounded-[8px] bg-[#f0faf7]" />
        </div>
      </div>
    </div>
  );
}

const PAGES = [
  {
    id: "homepage" as const,
    title: "Homepage",
    status: "Live",
    description: "Events, header, and resources for your main site page.",
    href: "/homepage-composer",
    Art: HomepageArt,
    enabled: true as const,
  },
  {
    id: "volunteer" as const,
    title: "Volunteer page",
    status: "Live",
    description: "Opportunities families can browse and sign up for.",
    href: "/volunteer-composer",
    Art: VolunteerArt,
    enabled: true as const,
  },
  {
    id: "sponsorship" as const,
    title: "Sponsorship page",
    status: "Coming soon",
    description: "Partner tiers and sponsor highlights — coming next.",
    href: null,
    Art: SponsorshipArt,
    enabled: false as const,
  },
];

export function WebsitePagesLanding({
  organizationName,
}: WebsitePagesLandingProps) {
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
        .cwai-card-enter { animation: cwai-fade-up 0.55s ease both; }
        .cwai-drift { animation: cwai-drift 7s ease-in-out infinite; }
        .cwai-drift-slow { animation: cwai-drift-slow 9s ease-in-out infinite; }
        .cwai-choice:hover .cwai-art { transform: translateY(-2px) scale(1.02); }
        .cwai-art { transition: transform 0.35s cubic-bezier(0.22, 1, 0.36, 1); }
        @media (prefers-reduced-motion: reduce) {
          .cwai-card-enter, .cwai-drift, .cwai-drift-slow { animation: none !important; }
          .cwai-choice:hover .cwai-art { transform: none; }
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
        <Link
          href="/create-with-ai"
          className="inline-block text-sm font-semibold text-cos-muted hover:text-cos-text"
        >
          ← Create with AI
        </Link>
        <p className="studio-eyebrow">Website pages</p>
        <h1 className="font-display text-4xl text-cos-text sm:text-5xl">
          Website pages
        </h1>
        <p className="text-sm leading-relaxed text-cos-muted sm:text-base">
          Edit, preview, and export pages for your site
          {organizationName ? ` — ${organizationName}` : ""}.
        </p>
      </header>

      <div className="relative grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {PAGES.map((page, index) => {
          const body = (
            <>
              <page.Art />
              <div className="mt-4 flex flex-1 flex-col px-1">
                <h2 className="font-display text-2xl text-cos-text">
                  {page.title}
                </h2>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                      page.enabled
                        ? "bg-[#e8f0ec] text-[#2f4a3c]"
                        : "bg-cos-bg-alt text-cos-muted",
                    )}
                  >
                    {page.status}
                  </span>
                </div>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-cos-muted">
                  {page.description}
                </p>
              </div>
            </>
          );

          const cardClass = cn(
            "cwai-card-enter cwai-choice group flex h-full flex-col rounded-[26px] border border-cos-border/80 bg-cos-card/95 p-3.5 text-left shadow-[0_10px_32px_rgba(42,38,34,0.06)] backdrop-blur-sm transition-[transform,box-shadow,border-color] duration-300",
            page.enabled &&
              "hover:-translate-y-1 hover:border-cos-brand-sage/50 hover:shadow-[0_18px_40px_rgba(42,38,34,0.1)]",
            !page.enabled && "cursor-not-allowed opacity-80",
          );
          const style = { animationDelay: `${index * 90}ms` };

          if (page.enabled && page.href) {
            return (
              <Link
                key={page.id}
                href={page.href}
                className={cardClass}
                style={style}
              >
                {body}
              </Link>
            );
          }

          return (
            <div
              key={page.id}
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
