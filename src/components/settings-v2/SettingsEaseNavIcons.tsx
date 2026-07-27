import type { SettingsEaseNavItem } from "@/components/settings-v2/settings-ease-nav-config";

const ICON_CLASS = "h-[15px] w-[15px]";

export function SettingsEaseNavIcon({
  icon,
}: {
  icon: SettingsEaseNavItem["icon"];
}) {
  switch (icon) {
    case "overview":
      return (
        <svg viewBox="0 0 24 24" className={ICON_CLASS} aria-hidden>
          <path
            d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
          />
        </svg>
      );
    case "organization":
      return (
        <svg viewBox="0 0 24 24" className={ICON_CLASS} aria-hidden>
          <path
            d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
          />
        </svg>
      );
    case "branding":
      return (
        <svg viewBox="0 0 24 24" className={ICON_CLASS} aria-hidden>
          <path
            d="M12 3c-2.8 3.6-6 6.2-6 10a6 6 0 0 0 12 0c0-3.8-3.2-6.4-6-10z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
          />
          <path
            d="M10 17.5c.4 1.2 1.2 2 2 2s1.6-.8 2-2"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
          />
        </svg>
      );
    case "team":
      return (
        <svg viewBox="0 0 24 24" className={ICON_CLASS} aria-hidden>
          <path
            d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
          />
          <circle
            cx="9"
            cy="7"
            r="3"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
          />
          <path
            d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a3 3 0 0 1 0 5.74"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
          />
        </svg>
      );
    case "integrations":
      return (
        <svg viewBox="0 0 24 24" className={ICON_CLASS} aria-hidden>
          <path
            d="M8 12h8M12 8v8"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
          />
          <circle
            cx="12"
            cy="12"
            r="9"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
          />
        </svg>
      );
    case "billing":
      return (
        <svg viewBox="0 0 24 24" className={ICON_CLASS} aria-hidden>
          <rect
            x="2"
            y="5"
            width="20"
            height="14"
            rx="2"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
          />
          <path
            d="M2 10h20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
          />
        </svg>
      );
    case "account":
      return (
        <svg viewBox="0 0 24 24" className={ICON_CLASS} aria-hidden>
          <circle
            cx="12"
            cy="8"
            r="3.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
          />
          <path
            d="M5 19a7 7 0 0 1 14 0"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
          />
        </svg>
      );
    default:
      return null;
  }
}
