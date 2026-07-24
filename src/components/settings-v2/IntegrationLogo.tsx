import Image from "next/image";
import { cn } from "@/lib/utils/cn";
import type { IntegrationId } from "@/lib/settings-v2/integration-types";

interface IntegrationLogoProps {
  id: IntegrationId;
  className?: string;
}

const INTEGRATION_ICONS: Partial<
  Record<IntegrationId, { src: string; alt: string; width: number; height: number }>
> = {
  "google-calendar": {
    src: "/integrations/google-calendar.png",
    alt: "Google Calendar",
    width: 390,
    height: 380,
  },
  "google-inbox": {
    src: "/integrations/gmail.png",
    alt: "Gmail",
    width: 478,
    height: 306,
  },
  meta: {
    src: "/integrations/meta.png",
    alt: "Meta",
    width: 392,
    height: 318,
  },
  monday: {
    src: "/integrations/monday.png",
    alt: "Monday.com",
    width: 464,
    height: 398,
  },
  "signup-genius": {
    src: "/integrations/signup-genius.png",
    alt: "SignUpGenius",
    width: 338,
    height: 326,
  },
};

function LogoFrame({
  children,
  className,
  backgroundClassName,
}: {
  children: React.ReactNode;
  className?: string;
  backgroundClassName?: string;
}) {
  return (
    <div
      className={cn(
        "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-cos-border",
        backgroundClassName ?? "bg-cos-bg",
        className,
      )}
      aria-hidden
    >
      {children}
    </div>
  );
}

export function IntegrationLogo({ id, className }: IntegrationLogoProps) {
  const icon = INTEGRATION_ICONS[id];
  if (icon) {
    const isSvg = icon.src.endsWith(".svg");
    return (
      <LogoFrame className={className} backgroundClassName="bg-white">
        {isSvg ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={icon.src}
            alt={icon.alt}
            className="h-8 w-8 object-contain"
          />
        ) : (
          <Image
            src={icon.src}
            alt={icon.alt}
            width={icon.width}
            height={icon.height}
            className="h-8 w-8 object-contain"
          />
        )}
      </LogoFrame>
    );
  }

  switch (id) {
    case "canva":
      return (
        <LogoFrame className={className} backgroundClassName="bg-white">
          <svg viewBox="0 0 64 64" className="h-8 w-8" role="img" aria-label="Canva">
            <defs>
              <linearGradient id="canvaGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#00C4CC" />
                <stop offset="100%" stopColor="#7D2AE8" />
              </linearGradient>
            </defs>
            <circle cx="32" cy="32" r="30" fill="url(#canvaGrad)" />
            <text
              x="32"
              y="38"
              textAnchor="middle"
              fill="#fff"
              fontSize="16"
              fontFamily="Georgia, 'Times New Roman', serif"
              fontStyle="italic"
            >
              Canva
            </text>
          </svg>
        </LogoFrame>
      );
    case "dropbox":
      return (
        <LogoFrame className={className} backgroundClassName="bg-[#0061FF]">
          <svg viewBox="0 0 24 24" className="h-5 w-5" role="img" aria-label="Dropbox">
            <path fill="#fff" d="m6 4 6 4-6 4-6-4 6-4Zm12 0 6 4-6 4-6-4 6-4ZM6 16l6 4 6-4-6-4-6 4Z" />
          </svg>
        </LogoFrame>
      );
    case "constant-contact":
      return (
        <LogoFrame className={className} backgroundClassName="bg-[#1856A3]">
          <svg viewBox="0 0 24 24" className="h-5 w-5" role="img" aria-label="Constant Contact">
            <circle cx="12" cy="12" r="7" fill="#fff" />
            <path
              fill="#1856A3"
              d="M12 8.5c1.1 0 2 .5 2.6 1.2l-1.2 1.1c-.4-.4-.9-.6-1.4-.6-.9 0-1.6.7-1.6 1.6s.7 1.6 1.6 1.6c.5 0 1-.2 1.4-.6l1.2 1.1c-.6.7-1.5 1.2-2.6 1.2-1.9 0-3.4-1.5-3.4-3.4s1.5-3.4 3.4-3.4Z"
            />
          </svg>
        </LogoFrame>
      );
    default:
      return (
        <LogoFrame className={className}>
          <span className="text-xs font-semibold text-cos-muted">?</span>
        </LogoFrame>
      );
  }
}
