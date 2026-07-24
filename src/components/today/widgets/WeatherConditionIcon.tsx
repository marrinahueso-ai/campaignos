import { cn } from "@/lib/utils/cn";

export type WeatherIconKind =
  | "sunny"
  | "partly_cloudy"
  | "cloudy"
  | "rainy"
  | "stormy"
  | "snowy"
  | "foggy"
  | "breezy";

interface WeatherConditionIconProps {
  condition: string;
  className?: string;
  /** Accessible label; omit when decorative next to visible text. */
  title?: string;
}

export function weatherIconKindFromCondition(condition: string): WeatherIconKind {
  const normalized = condition.toLowerCase();
  if (/\bstorm|thunder/.test(normalized)) return "stormy";
  if (/\brain|drizzle|shower/.test(normalized)) return "rainy";
  if (/\bsnow|ice|flurr/.test(normalized)) return "snowy";
  if (/\bfog|mist|haze/.test(normalized)) return "foggy";
  if (/\bbreeze|wind/.test(normalized)) return "breezy";
  if (/\bpartly|cloud/.test(normalized)) {
    if (/\bovercast|mostly cloudy|cloudy\b/.test(normalized) && !/partly/.test(normalized)) {
      return "cloudy";
    }
    return "partly_cloudy";
  }
  if (/\bsun|clear|fair|warm/.test(normalized)) return "sunny";
  return "partly_cloudy";
}

export function WeatherConditionIcon({
  condition,
  className,
  title,
}: WeatherConditionIconProps) {
  const kind = weatherIconKindFromCondition(condition);

  return (
    <svg
      viewBox="0 0 32 32"
      className={cn("shrink-0", className)}
      aria-hidden={title ? undefined : true}
      role={title ? "img" : undefined}
    >
      {title ? <title>{title}</title> : null}
      <IconArt kind={kind} />
    </svg>
  );
}

function IconArt({ kind }: { kind: WeatherIconKind }) {
  switch (kind) {
    case "sunny":
      return (
        <>
          <circle cx="16" cy="16" r="7" className="fill-cos-brand-mustard" />
          {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
            <rect
              key={deg}
              x="15"
              y="2"
              width="2"
              height="4.5"
              rx="1"
              className="fill-cos-brand-mustard"
              transform={`rotate(${deg} 16 16)`}
            />
          ))}
        </>
      );
    case "partly_cloudy":
      return (
        <>
          <circle cx="12" cy="12" r="5.5" className="fill-cos-brand-mustard" />
          <path
            d="M10 22.5c-3.2 0-5.5-2-5.5-4.6 0-2.1 1.4-3.9 3.5-4.5.5-2.4 2.6-4.2 5.2-4.2 2.4 0 4.4 1.5 5.2 3.6 2.4.3 4.3 2.2 4.3 4.6 0 2.7-2.3 4.9-5.5 4.9H10z"
            className="fill-[#9eb0c0]"
          />
          <path
            d="M11.5 21.2c-2.4 0-4.2-1.5-4.2-3.4 0-1.5 1-2.9 2.6-3.3.4-1.8 2-3.1 3.9-3.1 1.8 0 3.3 1.1 3.9 2.7 1.8.2 3.2 1.6 3.2 3.4 0 2-1.7 3.7-4.1 3.7h-5.3z"
            className="fill-[#c5d0db]"
          />
        </>
      );
    case "cloudy":
      return (
        <>
          <path
            d="M8.5 23c-3.5 0-6-2.2-6-5.1 0-2.3 1.5-4.3 3.8-5 .6-2.7 2.9-4.7 5.8-4.7 2.6 0 4.9 1.6 5.8 4 2.7.3 4.8 2.5 4.8 5.1 0 3-2.5 5.5-6.1 5.5H8.5z"
            className="fill-[#8fa3b5]"
          />
          <path
            d="M10 21.5c-2.7 0-4.6-1.6-4.6-3.7 0-1.7 1.1-3.1 2.9-3.6.4-2 2.2-3.5 4.4-3.5 2 0 3.7 1.2 4.3 3 2 .2 3.5 1.8 3.5 3.7 0 2.2-1.9 4.1-4.6 4.1H10z"
            className="fill-[#b7c5d3]"
          />
        </>
      );
    case "rainy":
      return (
        <>
          <path
            d="M8.5 17.5c-3.2 0-5.5-2-5.5-4.6 0-2.1 1.4-3.9 3.5-4.5.5-2.4 2.6-4.2 5.2-4.2 2.4 0 4.4 1.5 5.2 3.6 2.4.3 4.3 2.2 4.3 4.6 0 2.7-2.3 4.9-5.5 4.9H8.5z"
            className="fill-[#8fa3b5]"
          />
          <path
            d="M11 20.5l-1.2 3.2M16 20.5l-1.2 3.2M21 20.5l-1.2 3.2"
            className="stroke-[#5b8fd4]"
            strokeWidth="1.8"
            strokeLinecap="round"
            fill="none"
          />
        </>
      );
    case "stormy":
      return (
        <>
          <path
            d="M8.5 16.5c-3.2 0-5.5-2-5.5-4.6 0-2.1 1.4-3.9 3.5-4.5.5-2.4 2.6-4.2 5.2-4.2 2.4 0 4.4 1.5 5.2 3.6 2.4.3 4.3 2.2 4.3 4.6 0 2.7-2.3 4.9-5.5 4.9H8.5z"
            className="fill-cos-brand-navy"
          />
          <path
            d="M17 17.5l-3.2 5h3l-2.2 6.5 6.2-8h-3.2L21 17.5h-4z"
            className="fill-cos-brand-mustard"
          />
        </>
      );
    case "snowy":
      return (
        <>
          <path
            d="M8.5 16.5c-3.2 0-5.5-2-5.5-4.6 0-2.1 1.4-3.9 3.5-4.5.5-2.4 2.6-4.2 5.2-4.2 2.4 0 4.4 1.5 5.2 3.6 2.4.3 4.3 2.2 4.3 4.6 0 2.7-2.3 4.9-5.5 4.9H8.5z"
            className="fill-[#9eb0c0]"
          />
          <circle cx="11" cy="21.5" r="1.2" className="fill-[#7eb6e8]" />
          <circle cx="16.5" cy="23" r="1.2" className="fill-[#7eb6e8]" />
          <circle cx="21.5" cy="21" r="1.2" className="fill-[#7eb6e8]" />
          <circle cx="14" cy="26" r="1" className="fill-[#a8d4f5]" />
          <circle cx="19" cy="26.5" r="1" className="fill-[#a8d4f5]" />
        </>
      );
    case "foggy":
      return (
        <>
          <path
            d="M7 12h18M5 16h22M8 20h16"
            className="stroke-[#9aa8b5]"
            strokeWidth="2.2"
            strokeLinecap="round"
            fill="none"
          />
        </>
      );
    case "breezy":
      return (
        <>
          <path
            d="M6 12h12c2 0 3.5-1.4 3.5-3s-1.5-3-3.5-3"
            className="stroke-cos-brand-sage"
            strokeWidth="2"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M6 17h16c2.2 0 4 1.5 4 3.2S24.2 23.5 22 23.5"
            className="stroke-cos-brand-sage"
            strokeWidth="2"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M6 22h9"
            className="stroke-cos-brand-sage"
            strokeWidth="2"
            strokeLinecap="round"
            fill="none"
          />
        </>
      );
  }
}
