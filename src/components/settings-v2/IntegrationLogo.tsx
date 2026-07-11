import { cn } from "@/lib/utils/cn";
import type { IntegrationId } from "@/lib/settings-v2/integration-types";

interface IntegrationLogoProps {
  id: IntegrationId;
  className?: string;
}

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
  switch (id) {
    case "google-calendar":
      return (
        <LogoFrame className={className} backgroundClassName="bg-white">
          <svg viewBox="0 0 24 24" className="h-6 w-6" role="img" aria-label="Google Calendar">
            <path fill="#4285F4" d="M18 4h-1V2h-2v2H9V2H7v2H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2Z" />
            <path fill="#fff" d="M6 8h12v10H6V8Z" />
            <path fill="#EA4335" d="M8 10h2v2H8v-2Zm4 0h2v2h-2v-2Zm4 0h2v2h-2v-2ZM8 14h2v2H8v-2Zm4 0h2v2h-2v-2Zm4 0h2v2h-2v-2Z" />
            <path fill="#34A853" d="M8 18h2v2H8v-2Zm4 0h2v2h-2v-2Zm4 0h2v2h-2v-2Z" />
            <path fill="#FBBC04" d="M12 10h2v2h-2v-2Zm0 4h2v2h-2v-2Zm0 4h2v2h-2v-2Z" />
          </svg>
        </LogoFrame>
      );
    case "google-inbox":
      return (
        <LogoFrame className={className} backgroundClassName="bg-white">
          <svg viewBox="0 0 24 24" className="h-6 w-6" role="img" aria-label="Gmail">
            <path
              fill="#EA4335"
              d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2Z"
            />
            <path fill="#fff" d="m20 6-8 6L4 6h16Z" />
            <path fill="#C5221F" d="M4 6v12l8-6-8-6Zm16 0-8 6 8 6V6Z" />
            <path fill="#FBBC04" d="M12 12 4 6v1.5l8 5.5 8-5.5V6l-8 6Z" />
          </svg>
        </LogoFrame>
      );
    case "meta":
      return (
        <LogoFrame className={className} backgroundClassName="bg-[#0668E1]">
          <svg viewBox="0 0 24 24" className="h-6 w-6" role="img" aria-label="Meta">
            <path
              fill="#fff"
              d="M12 5.5c-2.2 0-3.6 2.4-4.6 4.9-.9 2.1-1.8 4.2-2.8 4.2-.6 0-1-.8-1-2.1 0-2.5 1.4-5.5 3.4-5.5.8 0 1.5.7 2.4 2.3.2.4.4.8.6 1.2.7-1.8 1.6-3.5 2.8-3.5 1.5 0 2.4 2.2 2.4 4.4 0 2.5-1.2 4.6-2.5 4.6-.5 0-.9-.6-1.3-1.5 1.1-2.6 1.3-4.7.6-4.7-.4 0-.9.6-1.4 1.7C10.6 8.2 9.4 6.5 8 6.5c-1.8 0-3.2 2.8-3.2 5.8 0 3.5 1.5 5.7 3.3 5.7 1.7 0 3.1-2.2 4.1-4.5.5 2 1.5 3.4 2.7 3.4 2.2 0 3.8-3.2 3.8-6.8C18.7 8.1 16.2 5.5 12 5.5Z"
            />
          </svg>
        </LogoFrame>
      );
    case "canva":
      return (
        <LogoFrame className={className} backgroundClassName="bg-[#00C4CC]">
          <svg viewBox="0 0 24 24" className="h-6 w-6" role="img" aria-label="Canva">
            <circle cx="12" cy="12" r="7" fill="#fff" />
            <path
              fill="#00C4CC"
              d="M12 7.5c1.2 0 2.2.4 3 1.1-.6.7-1 1.6-1 2.6 0 1.1.4 2 1 2.6-.8.7-1.8 1.1-3 1.1-2.5 0-4.5-2-4.5-4.5S9.5 7.5 12 7.5Z"
            />
          </svg>
        </LogoFrame>
      );
    case "monday":
      return (
        <LogoFrame className={className} backgroundClassName="bg-[#FF3D57]">
          <svg viewBox="0 0 24 24" className="h-5 w-5" role="img" aria-label="Monday.com">
            <circle cx="6" cy="12" r="3" fill="#fff" />
            <circle cx="12" cy="7" r="3" fill="#fff" />
            <circle cx="18" cy="12" r="3" fill="#fff" />
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
